// Zakat calculator logic
// Get references to inputs and outputs
const assetInputs = document.querySelectorAll('.asset-input');
const liabilityInputs = document.querySelectorAll('.liability-input');
const totalAssetsEl = document.getElementById('totalAssets');
const totalLiabilitiesEl = document.getElementById('totalLiabilities');
const netWealthEl = document.getElementById('netWealth');
const zakatDueEl = document.getElementById('zakatDue');
const resultCard = document.getElementById('resultCard');
const resetBtn = document.getElementById('resetBtn');
const shareBtn = document.getElementById('shareBtn');
const pdfBtn = document.getElementById('pdfBtn');

// settings elements
const silverPriceEl = document.getElementById('silverPrice');
const goldPriceEl = document.getElementById('goldPrice');
const currencySelect = document.getElementById('currencySelect');

// constants
const SILVER_NISAB_GRAMS = 612.36; // grams of silver

// helper to parse input value or 0
function valueOf(el) {
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

function calculateZakat() {
    // add assets; gold/silver inputs represent weight in grams, others are direct value
    let totalAssets = 0;
    assetInputs.forEach(inp => {
        let val = valueOf(inp);
        const name = inp.dataset.name;
        if (name === 'gold') {
            // convert grams to currency using current gold price
            val = val * valueOf(goldPriceEl);
        } else if (name === 'silver') {
            val = val * valueOf(silverPriceEl);
        }
        totalAssets += val;
    });
    // liabilities
    let totalLiabilities = 0;
    liabilityInputs.forEach(inp => {
        totalLiabilities += valueOf(inp);
    });

    // compute nisab threshold based on silver price
    const silverPrice = valueOf(silverPriceEl);
    const nisab = silverPrice * SILVER_NISAB_GRAMS;

    const netWealth = totalAssets - totalLiabilities;
    let zakat = 0;
    if (netWealth >= nisab && nisab > 0) {
        zakat = netWealth * 0.025;
    }

    // update UI
    totalAssetsEl.textContent = totalAssets.toFixed(2);
    totalLiabilitiesEl.textContent = totalLiabilities.toFixed(2);
    netWealthEl.textContent = netWealth.toFixed(2);
    zakatDueEl.textContent = zakat.toFixed(2);

    // show or hide result card
    if(netWealth > 0) {
        resultCard.classList.remove('hidden');
    } else {
        resultCard.classList.add('hidden');
    }
}

// listeners
assetInputs.forEach(inp => inp.addEventListener('input', calculateZakat));
liabilityInputs.forEach(inp => inp.addEventListener('input', calculateZakat));
silverPriceEl.addEventListener('input', calculateZakat);
goldPriceEl.addEventListener('input', calculateZakat);

resetBtn.addEventListener('click', () => {
    document.getElementById('zakatForm').reset();
    calculateZakat();
});

shareBtn.addEventListener('click', async () => {
    const text = `Zakat due: ${zakatDueEl.textContent} ${currencySelect.value}`;
    if (navigator.share) {
        try {
            await navigator.share({ text });
        } catch (err) {
            console.warn('Share failed', err);
        }
    } else {
        alert('Sharing not supported on this device');
    }
});

pdfBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Zakat Calculation Result', 10, 10);
    doc.text(`Total Assets: ${totalAssetsEl.textContent} ${currencySelect.value}`, 10, 20);
    doc.text(`Total Liabilities: ${totalLiabilitiesEl.textContent} ${currencySelect.value}`, 10, 30);
    doc.text(`Net Wealth: ${netWealthEl.textContent} ${currencySelect.value}`, 10, 40);
    doc.text(`Zakat Due: ${zakatDueEl.textContent} ${currencySelect.value}`, 10, 50);
    doc.save('zakat_result.pdf');
});

// scroll to calculator on start
const startBtn = document.getElementById('startBtn');
startBtn && startBtn.addEventListener('click', () => {
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
});

// fetch live gold/silver prices (simple example using a free API)
async function fetchPrices() {
    const errorEl = document.getElementById('priceError');
    errorEl.classList.add('hidden');
    try {
        const currency = currencySelect.value;
        // Fetch metal prices
        const resp = await fetch('https://api.metals.live/v1/spot');
        if (!resp.ok) throw new Error('HTTP '+resp.status);
        const data = await resp.json();
        // API returns array like: [{"metal":"XAU","price":1950.12,"currency":"USD"}, {"metal":"XAG","price":24.3,"currency":"USD"}]
        const goldObj = data.find(o => o.metal === 'XAU');
        const silverObj = data.find(o => o.metal === 'XAG');
        let goldPrice = goldObj ? goldObj.price : 0;
        let silverPrice = silverObj ? silverObj.price : 0;

        // If not USD, convert using exchange rate
        if (currency !== 'USD') {
            const rateResp = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
            if (!rateResp.ok) throw new Error('Exchange rate fetch failed');
            const rateData = await rateResp.json();
            const rate = rateData.rates[currency];
            if (rate) {
                goldPrice *= rate;
                silverPrice *= rate;
            }
        }

        goldPriceEl.value = goldPrice.toFixed(2);
        silverPriceEl.value = silverPrice.toFixed(2);

        // keep fields readonly when fetch succeeds
        goldPriceEl.readOnly = true;
        silverPriceEl.readOnly = true;
    } catch (e) {
        console.warn('Could not fetch metal prices, please enter manually:', e);
        errorEl.classList.remove('hidden');
        // allow manual input if fetching fails
        goldPriceEl.readOnly = false;
        silverPriceEl.readOnly = false;
        goldPriceEl.placeholder = 'enter price';
        silverPriceEl.placeholder = 'enter price';
    }
    calculateZakat();
}

// trigger fetch when currency changes (API may support currency query params)
currencySelect.addEventListener('change', () => {
    // for simplicity we just refetch; the endpoint may ignore currency
    fetchPrices();
});

// initial compute + price load
fetchPrices();

