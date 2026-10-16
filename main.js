// Elementos da Interface
const tempRange = document.getElementById('tempRange');
const vibRange = document.getElementById('vibRange');
const currRange = document.getElementById('currRange');
const sensorConditionSelect = document.getElementById('sensorConditionSelect');

const tempVal = document.getElementById('tempVal');
const vibVal = document.getElementById('vibVal');
const currVal = document.getElementById('currVal');

const badgeStatus = document.getElementById('badgeStatus');
const diagEstado = document.getElementById('diagEstado');
const diagTipoManut = document.getElementById('diagTipoManut');
const diagAcao = document.getElementById('diagAcao');

const btnEnviar = document.getElementById('btnEnviar');
const btnAutoSend = document.getElementById('btnAutoSend');
const logStatus = document.getElementById('logStatus');
const apiUrlInput = document.getElementById('apiUrlInput');

let autoInterval = null;

// Sincronização em tempo real dos seletores
tempRange.addEventListener('input', (e) => {
  tempVal.innerText = parseFloat(e.target.value).toFixed(1) + ' °C';
  atualizarDiagnosticoLocal();
});

vibRange.addEventListener('input', (e) => {
  vibVal.innerText = parseFloat(e.target.value).toFixed(1) + ' mm/s';
  atualizarDiagnosticoLocal();
});

currRange.addEventListener('input', (e) => {
  currVal.innerText = parseFloat(e.target.value).toFixed(1) + ' A';
  atualizarDiagnosticoLocal();
});

sensorConditionSelect.addEventListener('change', atualizarDiagnosticoLocal);

// Motor de Diagnóstico Preditivo/Corretivo (Regras do TCC)
function atualizarDiagnosticoLocal() {
  const temp = parseFloat(tempRange.value);
  const vib = parseFloat(vibRange.value);
  const curr = parseFloat(currRange.value);
  const condicao = sensorConditionSelect.value;

  let estado = "NORMAL";
  let tipoManut = "NENHUMA";
  let acao = "Operação dentro dos parâmetros nominais.";

  // 1. Condição Crítica (Corretiva)
  if (temp >= 80 || vib >= 7.1 || curr >= 45) {
    estado = "CRÍTICO";
    tipoManut = "CORRETIVA";
    badgeStatus.className = "px-4 py-2 rounded-full text-xs font-bold bg-red-600 text-white tracking-wide animate-pulse";
    badgeStatus.innerText = "SISTEMA CRÍTICO";
    diagEstado.className = "text-xs font-bold text-red-600";

    let motivo = temp >= 80 ? "Sobretemperatura PT100 ≥ 80°C" : (vib >= 7.1 ? "Vibração RMS ≥ 7.1 mm/s" : "Sobrecarga L1 ≥ 45A");

    if (condicao === "NOVO") {
      acao = `PARADA IMEDIATA! [${motivo}]. SENSOR NOVO EM FALHA: Checar instalação incorreta, curto-circuito/fiação, fixação solta ou defeito de fabricação.`;
    } else {
      acao = `PARADA IMEDIATA! [${motivo}]. SENSOR ANTIGO EM FALHA CRÍTICA: Fim de vida útil atingido. Substituir (trocar) o sensor/inserto e inspecionar o ativo.`;
    }

  // 2. Condição de Alerta (Preventiva / Preditiva)
  } else if (temp >= 65 || vib >= 4.5 || curr >= 35) {
    estado = "ALERTA";
    tipoManut = "PREVENTIVA / PREDITIVA";
    badgeStatus.className = "px-4 py-2 rounded-full text-xs font-bold bg-amber-500 text-white tracking-wide";
    badgeStatus.innerText = "ALERTA DE MANUTENÇÃO";
    diagEstado.className = "text-xs font-bold text-amber-600";

    let motivo = temp >= 65 ? "Temperatura elevada PT100 ≥ 65°C" : (vib >= 4.5 ? "Vibração elevada ≥ 4.5 mm/s" : "Corrente elevada L1 ≥ 35A");

    if (condicao === "NOVO") {
      acao = `INVESTIGAÇÃO TÉCNICA (Sensor NOVO): [${motivo}]. Verificar mau contato no conector M12, calibração inicial, aperto mecânico ou interferência eletromagnética.`;
    } else {
      acao = `AGENDAR PARADA PROGRAMADA (Sensor ANTIGO): [${motivo}]. Realizar manutenção preventiva, inspeção de desgaste e agendar possível troca preventiva.`;
    }

  // 3. Normal
  } else {
    badgeStatus.className = "px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 text-white tracking-wide";
    badgeStatus.innerText = "SISTEMA NORMAL";
    diagEstado.className = "text-xs font-bold text-emerald-600";
  }

  diagEstado.innerText = estado;
  diagTipoManut.innerText = tipoManut;
  diagAcao.innerText = acao;
}

// Comunicação HTTP POST com o Google Apps Script
async function enviarDados() {
  const apiUrl = apiUrlInput.value;

  if (!apiUrl) {
    alert('Por favor, defina a URL da API do Google Apps Script.');
    return;
  }

  const payload = {
    asset: document.getElementById('assetInput').value,
    sensorCondition: sensorConditionSelect.value,
    temperature: parseFloat(tempRange.value),
    vibration: parseFloat(vibRange.value),
    current: parseFloat(currRange.value),
    horimetroTotal: document.getElementById('horimetroInput').value + " h",
    totalKWh: document.getElementById('energiaInput').value,
    healthIndex: document.getElementById('saudeInput').value + "%"
  };

  logStatus.innerText = "Enviando telemetria para a planilha...";
  logStatus.className = "text-[11px] text-center text-blue-600 font-mono animate-pulse";

  try {
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    logStatus.innerText = "✅ Leitura enviada com sucesso! (" + new Date().toLocaleTimeString() + ")";
    logStatus.className = "text-[11px] text-center text-emerald-600 font-mono font-bold";
  } catch (err) {
    logStatus.innerText = "❌ Erro ao enviar dados: " + err.message;
    logStatus.className = "text-[11px] text-center text-red-600 font-mono font-bold";
  }
}

// Controle de envio em malha fechada/automático
function toggleAutoSend() {
  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
    btnAutoSend.innerHTML = "<span>⏱️</span> Envio Automático";
    btnAutoSend.className = "w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow transition-all active:scale-95 flex justify-center items-center gap-2";
    logStatus.innerText = "Envio automático parado.";
    logStatus.className = "text-[11px] text-center text-slate-400 font-mono";
  } else {
    enviarDados();
    autoInterval = setInterval(enviarDados, 5000);
    btnAutoSend.innerHTML = "<span>⏹️</span> Parar Envio (5s)";
    btnAutoSend.className = "w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs shadow transition-all active:scale-95 flex justify-center items-center gap-2";
  }
}

// Event Listeners
btnEnviar.addEventListener('click', enviarDados);
btnAutoSend.addEventListener('click', toggleAutoSend);

// Inicialização automática do diagnóstico
atualizarDiagnosticoLocal();