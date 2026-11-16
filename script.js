/* ============================================
   BOURBON BARBEARIA — script.js
   Agendamento interativo em 5 etapas
   ============================================ */

// Volta ao topo ao recarregar (evita scroll restaurado pelo browser)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('load', () => window.scrollTo(0, 0));

// Ano no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();

// ── Hambúrguer ──────────────────────────────────────────────
const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('nav');

menuToggle.addEventListener('click', () => {
    const aberto = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', aberto);
});

// Fecha ao clicar em qualquer link do menu
nav.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
    })
);

// Fecha ao pressionar ESC
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.focus();
    }
});


// ── Constantes do agendamento ───────────────────────────────
const MESES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

// WhatsApp da barbearia (DDI + DDD + número, só dígitos).
// Recebe a mensagem do agendamento — o cliente só toca em "Enviar".
const WHATSAPP_BARBEARIA = '5511978888039';

const HORARIOS = [
    '09:00','10:00','11:00','14:00',
    '15:00','16:00','17:00','18:00','19:00'
];


// ── Estado do agendamento ───────────────────────────────────
const ag = {
    nome:     '',
    telefone: '',
    servicos: [{ nome: 'Corte de Cabelo', preco: 50, duracao: 30 }],
    barbeiro: 'Lucas Ferreira',
    data:     null,
    horario:  ''
};


// ── Utilitários ─────────────────────────────────────────────
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const moeda = v => 'R$ ' + v.toFixed(2).replace('.', ',');

/** Rola suavemente para a coluna da etapa em mobile */
function scrollParaColuna(etapa) {
    if (window.innerWidth <= 640) {
        const el = document.getElementById('col-etapa-' + etapa);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

let etapaAtual = 1;

/** Ativa a etapa N na barra de progresso */
function irParaEtapa(n, rolar = true) {
    etapaAtual = n;
    $$('#etapas li').forEach((li, i) => {
        const ativa = i < n;          // todas as anteriores ficam marcadas
        li.classList.toggle('ativa', ativa);
        li.removeAttribute('aria-current');
        if (i === n - 1) li.setAttribute('aria-current', 'step');
    });
    if (rolar) scrollParaColuna(n);
}

/** Totais dos serviços escolhidos */
const totalPreco   = () => ag.servicos.reduce((s, x) => s + x.preco, 0);
const totalDuracao = () => ag.servicos.reduce((s, x) => s + x.duracao, 0);
const nomesServicos = () => ag.servicos.map(x => x.nome).join(' + ');

/**
 * Liga botões de seleção (serviço ou barbeiro).
 * Atualiza estado, avança etapa e recalcula resumo.
 */
function ligar(seletor, aoEscolher, proximaEtapa) {
    $$(seletor).forEach(btn => {
        btn.addEventListener('click', () => {
            $$(seletor).forEach(b => {
                b.classList.remove('ativo');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('ativo');
            btn.setAttribute('aria-pressed', 'true');
            aoEscolher(btn.dataset);
            irParaEtapa(proximaEtapa);
            resumo();
        });
    });
}

// ── Dados do cliente (etapa 1) ──────────────────────────────
const campoNome = $('#cli-nome');
const campoTel  = $('#cli-tel');

const nomeValido = () => campoNome.value.trim().length >= 3;
const telValido  = () => campoTel.value.replace(/\D/g, '').length >= 10;

/** Máscara (11) 99999-9999 */
function mascaraTelefone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2)  return d;
    if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

campoNome.addEventListener('input', () => {
    ag.nome = campoNome.value.trim();
    campoNome.classList.remove('invalido');
    resumo();
});

campoTel.addEventListener('input', () => {
    campoTel.value = mascaraTelefone(campoTel.value);
    ag.telefone = campoTel.value;
    campoTel.classList.remove('invalido');
    resumo();
});

// Ao sair dos campos: se estiver tudo certo, avança para a etapa 2
[campoNome, campoTel].forEach(campo =>
    campo.addEventListener('blur', () => {
        if (nomeValido() && telValido() && etapaAtual < 2) irParaEtapa(2);
    })
);


// Serviços: seleção múltipla (clique liga/desliga cada serviço)
$$('[data-servico]').forEach(btn => {
    btn.addEventListener('click', () => {
        const ativo = btn.classList.toggle('ativo');
        btn.setAttribute('aria-pressed', ativo);

        // Reconstrói a lista na ordem em que aparecem na tela
        ag.servicos = [...$$('[data-servico].ativo')].map(b => ({
            nome:    b.dataset.servico,
            preco:   +b.dataset.preco,
            duracao: +b.dataset.duracao
        }));

        // Marca a etapa 2 como feita, sem rolar (a pessoa pode escolher mais serviços)
        if (ag.servicos.length && etapaAtual < 3) irParaEtapa(3, false);
        resumo();
    });
});

// Conecta botões de barbeiro → avança para etapa 4
ligar('[data-barbeiro]', d => {
    ag.barbeiro = d.barbeiro;
}, 4);


// ── Horários ─────────────────────────────────────────────────
HORARIOS.forEach(h => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'horario';
    btn.textContent = h;
    btn.setAttribute('aria-label', `Horário ${h}`);
    btn.setAttribute('aria-pressed', 'false');

    btn.addEventListener('click', () => {
        $$('.horario').forEach(x => {
            x.classList.remove('ativo');
            x.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('ativo');
        btn.setAttribute('aria-pressed', 'true');
        ag.horario = h;
        irParaEtapa(5);
        resumo();
    });

    $('#horarios').appendChild(btn);
});


// ── Calendário ───────────────────────────────────────────────
const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
let mes = hoje.getMonth(), ano = hoje.getFullYear();

function desenharCalendario() {
    const tituloEl = $('#mes-titulo');
    tituloEl.textContent = `${MESES[mes]} ${ano}`;

    const box = $('#dias');
    box.innerHTML = '';

    const primeiroDia   = new Date(ano, mes, 1).getDay();   // 0=Dom
    const totalDias     = new Date(ano, mes + 1, 0).getDate();
    const totalMesAnt   = new Date(ano, mes, 0).getDate();

    // Dias do mês anterior (cinza / desabilitados)
    for (let i = primeiroDia; i > 0; i--) {
        box.insertAdjacentHTML('beforeend',
            `<button class="fora" disabled aria-hidden="true">${totalMesAnt - i + 1}</button>`
        );
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDias; d++) {
        const data = new Date(ano, mes, d);
        const btn  = document.createElement('button');
        btn.type = 'button';
        btn.textContent = d;

        const passado = data < hoje;
        const domingo = data.getDay() === 0;

        btn.disabled = passado || domingo;

        if (ag.data && +ag.data === +data) {
            btn.classList.add('ativo');
            btn.setAttribute('aria-pressed', 'true');
        }

        const label = `${d} de ${MESES[mes]}`;
        btn.setAttribute('aria-label', passado ? `${label} — data indisponível` : label);

        btn.addEventListener('click', () => {
            ag.data = data;
            desenharCalendario();
            resumo();
        });

        box.appendChild(btn);
    }

    // Preenchimento final
    const resto = (7 - (primeiroDia + totalDias) % 7) % 7;
    for (let d = 1; d <= resto; d++) {
        box.insertAdjacentHTML('beforeend',
            `<button class="fora" disabled aria-hidden="true">${d}</button>`
        );
    }
}

$('#mes-ant').addEventListener('click', () => {
    if (--mes < 0) { mes = 11; ano--; }
    desenharCalendario();
});

$('#mes-prox').addEventListener('click', () => {
    if (++mes > 11) { mes = 0; ano++; }
    desenharCalendario();
});


// ── Resumo ───────────────────────────────────────────────────
function resumo() {
    $('#r-cliente').textContent  = ag.nome || '–';
    $('#r-telefone').textContent = ag.telefone || '–';
    $('#r-servico').textContent  = ag.servicos.length ? `${nomesServicos()} — ${moeda(totalPreco())}` : '–';
    $('#r-barbeiro').textContent = ag.barbeiro;
    $('#r-data').textContent     = ag.data
        ? `${ag.data.getDate()} de ${MESES[ag.data.getMonth()]} de ${ag.data.getFullYear()}`
        : '–';
    $('#r-horario').textContent  = ag.horario || '–';
    $('#r-duracao').textContent  = totalDuracao() + ' min';
    $('#r-total').textContent    = moeda(totalPreco());
}


// ── Confirmação ──────────────────────────────────────────────
$('#confirmar').addEventListener('click', () => {
    if (!nomeValido()) {
        campoNome.classList.add('invalido');
        scrollParaColuna(1);
        campoNome.focus();
        alert('Por favor, informe seu nome completo.');
        return;
    }

    if (!telValido()) {
        campoTel.classList.add('invalido');
        scrollParaColuna(1);
        campoTel.focus();
        alert('Por favor, informe um WhatsApp válido com DDD.');
        return;
    }

    if (!ag.servicos.length) {
        scrollParaColuna(2);
        alert('Por favor, escolha pelo menos um serviço.');
        return;
    }

    if (!ag.data || !ag.horario) {
        alert('Por favor, escolha a data e o horário antes de confirmar.');
        return;
    }

    const dataFormatada = `${ag.data.getDate()} de ${MESES[ag.data.getMonth()]} de ${ag.data.getFullYear()}`;

    // Mensagem pronta para o WhatsApp
    const mensagem =
        `✅ *Novo agendamento — Bourbon Barbearia*\n\n` +
        `👤 Cliente: ${ag.nome}\n` +
        `📱 WhatsApp: ${ag.telefone}\n` +
        `✂️ Serviços: ${nomesServicos()}\n` +
        `💈 Barbeiro: ${ag.barbeiro}\n` +
        `📅 Data: ${dataFormatada}\n` +
        `🕐 Horário: ${ag.horario}\n` +
        `⏱️ Duração: ${totalDuracao()} min\n` +
        `💰 Total: ${moeda(totalPreco())}`;

    const linkWhatsApp =
        `https://wa.me/${WHATSAPP_BARBEARIA}?text=${encodeURIComponent(mensagem)}`;

    // Abre o WhatsApp com a mensagem preenchida (precisa rodar dentro do clique)
    window.open(linkWhatsApp, '_blank', 'noopener');

    alert(
        `✅ Agendamento confirmado!\n\n` +
        `Cliente:  ${ag.nome}\n` +
        `WhatsApp: ${ag.telefone}\n` +
        `Serviços: ${nomesServicos()}\n` +
        `Barbeiro: ${ag.barbeiro}\n` +
        `Data:     ${dataFormatada}\n` +
        `Horário:  ${ag.horario}\n` +
        `Duração:  ${totalDuracao()} min\n` +
        `Total:    ${moeda(totalPreco())}\n\n` +
        `Toque em "Enviar" no WhatsApp para concluir.`
    );
});


// ── Inicialização ────────────────────────────────────────────
desenharCalendario();
resumo();
