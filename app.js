/* ==========================================================================
   VoltPayback PRO - Calculation Engine & Interactive Mechanics
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Vehicle Presets Data
  const PRESETS = {
    modelY: { dailyMiles: 35, evEfficiency: 3.6, gasMPG: 25, gasPrice: 3.65 },
    model3: { dailyMiles: 35, evEfficiency: 4.0, gasMPG: 28, gasPrice: 3.65 },
    f150: { dailyMiles: 45, evEfficiency: 2.1, gasMPG: 18, gasPrice: 3.65 },
    bolt: { dailyMiles: 30, evEfficiency: 3.9, gasMPG: 30, gasPrice: 3.65 },
    ioniq5: { dailyMiles: 35, evEfficiency: 3.5, gasMPG: 26, gasPrice: 3.65 },
    custom: { dailyMiles: 35, evEfficiency: 3.5, gasMPG: 25, gasPrice: 3.65 }
  };

  // Charging Equipment Efficiency Factors
  const CHARGING_EFFICIENCY = {
    L1: 0.85, // Level 1 (120V) ~ 15% energy loss
    L2: 0.90  // Level 2 (240V) ~ 10% energy loss
  };

  // DOM Elements - Inputs
  const elDailyMiles = document.getElementById('dailyMiles');
  const elGasPrice = document.getElementById('gasPrice');
  const elGasMPG = document.getElementById('gasMPG');
  const elEvEfficiency = document.getElementById('evEfficiency');
  const elElectricRate = document.getElementById('electricRate');
  const elOffPeakRate = document.getElementById('offPeakRate');
  const elUseTOU = document.getElementById('useTOU');
  const elSolarCost = document.getElementById('solarCost');
  const elSolarOffset = document.getElementById('solarOffset');
  const elApplyITC = document.getElementById('applyITC');
  
  // DOM Elements - Badges
  const elValDailyMiles = document.getElementById('valDailyMiles');
  const elValAnnualMiles = document.getElementById('valAnnualMiles');
  const elValGasPrice = document.getElementById('valGasPrice');
  const elValGasMPG = document.getElementById('valGasMPG');
  const elValEvEfficiency = document.getElementById('valEvEfficiency');
  const elValElectricRate = document.getElementById('valElectricRate');
  const elValOffPeakRate = document.getElementById('valOffPeakRate');
  const elValSolarCost = document.getElementById('valSolarCost');
  const elValSolarOffset = document.getElementById('valSolarOffset');
  const elItcSavingsText = document.getElementById('itcSavingsText');

  // DOM Elements - Top Metric Outputs
  const elOutAnnualSavings = document.getElementById('outAnnualSavings');
  const elOutChargingCost = document.getElementById('outChargingCost');
  const elOutSolarEVCost = document.getElementById('outSolarEVCost');
  const elOutSolarOffsetLabel = document.getElementById('outSolarOffsetLabel');
  const elOutPaybackYears = document.getElementById('outPaybackYears');
  const elOutITCCreditLabel = document.getElementById('outITCCreditLabel');

  // DOM Elements - Breakdown Table
  const elTableGasGallons = document.getElementById('tableGasGallons');
  const elTableGasCPM = document.getElementById('tableGasCPM');
  const elTableGasTotal = document.getElementById('tableGasTotal');
  
  const elTableGridKWh = document.getElementById('tableGridKWh');
  const elTableGridCPM = document.getElementById('tableGridCPM');
  const elTableGridTotal = document.getElementById('tableGridTotal');
  
  const elTableTouKWh = document.getElementById('tableTouKWh');
  const elTableTouCPM = document.getElementById('tableTouCPM');
  const elTableTouTotal = document.getElementById('tableTouTotal');

  const elTableSolarKWh = document.getElementById('tableSolarKWh');
  const elTableSolarCPM = document.getElementById('tableSolarCPM');
  const elTableSolarTotal = document.getElementById('tableSolarTotal');

  // DOM Elements - Chart
  const elPathGas = document.getElementById('pathGas');
  const elPathGrid = document.getElementById('pathGrid');
  const elPathSolar = document.getElementById('pathSolar');
  const elXAxisLabels = document.getElementById('xAxisLabels');
  const elChartNetSolarCost = document.getElementById('chartNetSolarCost');

  // ==========================================================================
  // 1. Scroll-Triggered Picture Frame Animation Handler
  // ==========================================================================
  const scrollFrames = document.querySelectorAll('.scroll-frame-wrapper');

  if ('IntersectionObserver' in window) {
    const frameObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, {
      threshold: 0.25
    });

    scrollFrames.forEach(frame => frameObserver.observe(frame));
  } else {
    scrollFrames.forEach(frame => frame.classList.add('is-visible'));
  }

  // Optional: Dynamic 3D tilt effect on hover for picture frames
  scrollFrames.forEach(frame => {
    frame.addEventListener('mousemove', (e) => {
      const rect = frame.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = (y / rect.height) * -8;
      const rotateY = (x / rect.width) * 8;
      frame.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    frame.addEventListener('mouseleave', () => {
      frame.style.transform = '';
    });
  });

  // ==========================================================================
  // 2. Preset Selection Buttons
  // ==========================================================================
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.getAttribute('data-preset');
      if (PRESETS[presetKey]) {
        const p = PRESETS[presetKey];
        elDailyMiles.value = p.dailyMiles;
        elEvEfficiency.value = p.evEfficiency;
        elGasMPG.value = p.gasMPG;
        elGasPrice.value = p.gasPrice;
        calculateAll();
      }
    });
  });

  // Helper: Get selected charging level (L1 vs L2)
  function getChargingLevelEfficiency() {
    const selected = document.querySelector('input[name="chargingLevel"]:checked');
    return selected ? CHARGING_EFFICIENCY[selected.value] : CHARGING_EFFICIENCY.L2;
  }

  // ==========================================================================
  // 3. Financial & Energy Calculation Engine
  // ==========================================================================
  function calculateAll() {
    // Read raw inputs
    const dailyMiles = parseFloat(elDailyMiles.value);
    const annualMiles = dailyMiles * 365;
    const gasPrice = parseFloat(elGasPrice.value);
    const gasMPG = parseFloat(elGasMPG.value);
    const evEfficiency = parseFloat(elEvEfficiency.value); // mi / kWh
    const chargingEfficiency = getChargingLevelEfficiency(); // 0.85 or 0.90
    const electricRate = parseFloat(elElectricRate.value); // $/kWh
    const offPeakRate = parseFloat(elOffPeakRate.value); // $/kWh
    const useTOU = elUseTOU.checked;
    const grossSolarCost = parseFloat(elSolarCost.value);
    const solarOffsetPercent = parseFloat(elSolarOffset.value) / 100;
    const applyITC = elApplyITC.checked;

    // Update Input Display Badges
    elValDailyMiles.textContent = dailyMiles;
    elValAnnualMiles.textContent = annualMiles.toLocaleString();
    elValGasPrice.textContent = gasPrice.toFixed(2);
    elValGasMPG.textContent = gasMPG;
    elValEvEfficiency.textContent = evEfficiency.toFixed(1);
    elValElectricRate.textContent = electricRate.toFixed(2);
    elValOffPeakRate.textContent = offPeakRate.toFixed(2);
    elValSolarCost.textContent = grossSolarCost.toLocaleString();
    elValSolarOffset.textContent = Math.round(solarOffsetPercent * 100);

    const itcAmount = applyITC ? grossSolarCost * 0.30 : 0;
    elItcSavingsText.textContent = `$${Math.round(itcAmount).toLocaleString()}`;
    const netSolarCost = grossSolarCost - itcAmount;
    elChartNetSolarCost.textContent = Math.round(netSolarCost).toLocaleString();

    // 1. Gas Vehicle Costs
    const annualGasGallons = annualMiles / gasMPG;
    const annualGasCost = annualGasGallons * gasPrice;
    const gasCostPerMile = annualGasCost / annualMiles;

    // 2. Grid EV Charging Costs (Standard vs TOU)
    // Grid kWh needed = (Miles / Efficiency) / Charging Equipment Loss Factor
    const netKWhNeeded = annualMiles / evEfficiency;
    const grossGridKWhNeeded = netKWhNeeded / chargingEfficiency;

    const annualStandardGridCost = grossGridKWhNeeded * electricRate;
    const gridStandardCostPerMile = annualStandardGridCost / annualMiles;

    const effectiveGridRate = useTOU ? offPeakRate : electricRate;
    const annualEffectiveGridCost = grossGridKWhNeeded * effectiveGridRate;
    const gridEffectiveCostPerMile = annualEffectiveGridCost / annualMiles;

    // 3. Solar Powered EV Charging Costs
    // Non-offset portion is purchased at effective grid rate
    const gridKWhAfterSolar = grossGridKWhNeeded * (1 - solarOffsetPercent);
    const annualSolarEVCost = gridKWhAfterSolar * effectiveGridRate;
    const solarCostPerMile = annualSolarEVCost / annualMiles;

    // 4. Annual Net Savings & Payback Period
    const annualSavingsVSGas = annualGasCost - annualEffectiveGridCost;
    const annualTotalEnergySavings = annualGasCost - annualSolarEVCost;

    // Solar payback calculation (Net Solar Cost / Annual Total Energy Savings)
    const paybackYears = netSolarCost / (annualTotalEnergySavings > 0 ? annualTotalEnergySavings : 1);

    // ==========================================================================
    // 4. Update UI Outputs
    // ==========================================================================
    elOutAnnualSavings.textContent = `$${Math.round(annualSavingsVSGas).toLocaleString()}`;
    elOutChargingCost.innerHTML = `$${Math.round(annualEffectiveGridCost).toLocaleString()} <span class="metric-vs">vs $${Math.round(annualGasCost).toLocaleString()}</span>`;
    elOutSolarEVCost.textContent = `$${Math.round(annualSolarEVCost).toLocaleString()} / year`;
    elOutSolarOffsetLabel.textContent = `With ${Math.round(solarOffsetPercent * 100)}% solar offset`;
    
    if (paybackYears > 25) {
      elOutPaybackYears.textContent = '> 25 Years';
    } else {
      elOutPaybackYears.textContent = `${paybackYears.toFixed(1)} Years`;
    }
    elOutITCCreditLabel.textContent = applyITC ? `Includes 30% Federal ITC ($${Math.round(itcAmount).toLocaleString()})` : 'No Tax Credit Applied';

    // Update Breakdown Table
    elTableGasGallons.textContent = `${Math.round(annualGasGallons).toLocaleString()} Gal`;
    elTableGasCPM.textContent = `$${gasCostPerMile.toFixed(3)}`;
    elTableGasTotal.textContent = `$${Math.round(annualGasCost).toLocaleString()}`;

    elTableGridKWh.textContent = `${Math.round(grossGridKWhNeeded).toLocaleString()} kWh`;
    elTableGridCPM.textContent = `$${gridStandardCostPerMile.toFixed(3)}`;
    elTableGridTotal.textContent = `$${Math.round(annualStandardGridCost).toLocaleString()}`;

    elTableTouKWh.textContent = `${Math.round(grossGridKWhNeeded).toLocaleString()} kWh`;
    elTableTouCPM.textContent = `$${gridEffectiveCostPerMile.toFixed(3)}`;
    elTableTouTotal.textContent = `$${Math.round(annualEffectiveGridCost).toLocaleString()}`;

    elTableSolarKWh.textContent = `${Math.round(grossGridKWhNeeded).toLocaleString()} kWh`;
    elTableSolarCPM.textContent = `$${solarCostPerMile.toFixed(3)}`;
    elTableSolarTotal.textContent = `$${Math.round(annualSolarEVCost).toLocaleString()}`;

    // ==========================================================================
    // 5. Render Interactive 10-Year SVG Chart
    // ==========================================================================
    renderCumulativeChart({
      annualGasCost,
      annualGridCost: annualEffectiveGridCost,
      annualSolarEVCost,
      netSolarCost
    });
  }

  // SVG Chart Render Function
  function renderCumulativeChart({ annualGasCost, annualGridCost, annualSolarEVCost, netSolarCost }) {
    const years = 10;
    const paddingX = 50;
    const width = 570 - paddingX;
    const paddingYTop = 30;
    const height = 230 - paddingYTop;
    const maxAmount = Math.max(
      annualGasCost * years,
      netSolarCost + (annualSolarEVCost * years),
      35000
    );

    function getCoords(year, amount) {
      const x = paddingX + (year / years) * width;
      const y = (230) - (amount / maxAmount) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }

    let dGas = `M ${getCoords(0, 0)}`;
    let dGrid = `M ${getCoords(0, 0)}`;
    let dSolar = `M ${getCoords(0, netSolarCost)}`;

    for (let y = 1; y <= years; y++) {
      const gasCum = annualGasCost * y;
      const gridCum = annualGridCost * y;
      const solarCum = netSolarCost + (annualSolarEVCost * y);

      dGas += ` L ${getCoords(y, gasCum)}`;
      dGrid += ` L ${getCoords(y, gridCum)}`;
      dSolar += ` L ${getCoords(y, solarCum)}`;
    }

    elPathGas.setAttribute('d', dGas);
    elPathGrid.setAttribute('d', dGrid);
    elPathSolar.setAttribute('d', dSolar);

    // Update X-Axis Labels
    let labelsHTML = '';
    for (let y = 0; y <= years; y += 2) {
      const x = paddingX + (y / years) * width;
      labelsHTML += `<text x="${x.toFixed(1)}" y="250" font-size="10" fill="#9CA3AF" text-anchor="middle">Yr ${y}</text>`;
    }
    elXAxisLabels.innerHTML = labelsHTML;
  }

  // Attach Event Listeners to Inputs
  const inputs = [
    elDailyMiles, elGasPrice, elGasMPG, elEvEfficiency,
    elElectricRate, elOffPeakRate, elUseTOU, elSolarCost,
    elSolarOffset, elApplyITC
  ];

  inputs.forEach(input => {
    input.addEventListener('input', calculateAll);
    input.addEventListener('change', calculateAll);
  });

  document.querySelectorAll('input[name="chargingLevel"]').forEach(radio => {
    radio.addEventListener('change', calculateAll);
  });

  // Initial Calculation Run
  calculateAll();

});
