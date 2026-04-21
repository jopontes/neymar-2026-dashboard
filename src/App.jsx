import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from 'recharts';
import { Activity, ShieldAlert, HeartPulse, Trophy, Repeat, Quote, CalendarDays, Brain, CheckCircle, XCircle, SlidersHorizontal, User, ThumbsUp, ThumbsDown, HelpCircle, Target, Zap, Eye, Flame, Clock, Shield } from 'lucide-react';

import { playersInfo, evolutionData, matchHistory } from './data';

const METRICS = [
  { id: 'ga', label: 'Participações (Gols + Assistências)' },
  { id: 'gols', label: 'Apenas Gols' },
  { id: 'assist', label: 'Apenas Assistências' },
  { id: 'mins', label: 'Minutos em Campo (Físico/Saúde)' },
  { id: 'jogos', label: 'Partidas Disputadas' },
  { id: 'xg', label: 'Expected Goals (xG)' },
  { id: 'xa', label: 'Expected Assists (xA)' },
  { id: 'chancesCriadas', label: 'Chances Criadas (Criação)' },
  { id: 'driblesCertos', label: 'Dribles Certos (Quebra de Linha)' },
  { id: 'passesProgressivos', label: 'Passes Progressivos (Ritmo)' },
  { id: 'disponibilidade', label: 'Disponibilidade Física (%)' }
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.fill || entry.stroke, fontWeight: 'bold', fontSize: '1.2rem' }}>
            {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function ArgumentCard({ title, quote, author, icon: Icon, analysis, category }) {
  const catColors = { favor: '#22c55e', contra: '#ef4444', duvida: '#f59e0b' };
  const catLabels = { favor: '✅ A Favor', contra: '❌ Contra', duvida: '🤔 Dúvida' };
  const catColor = catColors[category] || '#8a8f98';
  return (
    <div className="bento-item item-medium">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: catColor, background: `${catColor}22`, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {catLabels[category]}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#8a8f98', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <User size={12} /> {author}
        </span>
      </div>
      <div className="metric-context">
        <Quote size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
        <em>"{quote}"</em>
      </div>
      <h2 className="section-title"><Icon size={24} /> {title}</h2>
      <div className="text-content" dangerouslySetInnerHTML={{ __html: analysis }} />
    </div>
  );
}

function MatchCard({ match }) {
  return (
    <div className="bento-item item-medium" style={{ borderLeft: match.playedWell ? '4px solid #22c55e' : '4px solid #ef4444' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#8a8f98', textTransform: 'uppercase', letterSpacing: '1px' }}>{match.date} • {match.importance}</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.2rem', color: '#fff' }}>{match.score}</h2>
        </div>
        <div>
          {match.playedWell ? <CheckCircle size={32} color="#22c55e" /> : <XCircle size={32} color="#ef4444" />}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <strong>Neymar na convocação?</strong> {match.neymarPlayed ? '✅ Sim' : '❌ Não'}
        </p>
      </div>

      <div className="text-content" style={{ fontSize: '0.95rem' }}>
        <p><strong>Análise Tática:</strong> {match.dataAnalysis}</p>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'matches'
  const [viewMode, setViewMode] = useState('selecao'); // 'selecao' | 'clubes'
  const [activeMetric, setActiveMetric] = useState('ga');
  const [selectedPlayers, setSelectedPlayers] = useState(['neymar', 'vini', 'raphinha', 'estevao', 'joaopedro']);

  const availableMetrics = useMemo(() => {
    return METRICS.filter(metric => {
      // Métricas básicas sempre ficam
      if (['ga', 'gols', 'assist', 'mins', 'jogos'].includes(metric.id)) return true;
      
      // Métricas avançadas: só mostra se houver algum dado não-zero no modo atual
      return evolutionData.some(yearData => {
        const modeData = yearData[viewMode];
        if (!modeData) return false;
        return Object.values(modeData).some(playerStats => 
          playerStats && playerStats[metric.id] > 0
        );
      });
    });
  }, [viewMode]);

  // Se o usuário trocar o modo e a métrica atual sumir, volta para Participações
  useEffect(() => {
    if (!availableMetrics.find(m => m.id === activeMetric)) {
      setActiveMetric('ga');
    }
  }, [viewMode, availableMetrics, activeMetric]);

  const togglePlayer = (id) => {
    if (selectedPlayers.includes(id)) {
      if (selectedPlayers.length > 1) {
        setSelectedPlayers(selectedPlayers.filter(p => p !== id));
      }
    } else {
      if (selectedPlayers.length < 5) {
        setSelectedPlayers([...selectedPlayers, id]);
      } else {
        alert("Você só pode comparar até 5 jogadores simultaneamente no gráfico de linhas.");
      }
    }
  };

  // Calcula dinamicamente o Ranking baseado na métrica selecionada e modo de visão (Soma dos 8 anos)
  const currentRanking = useMemo(() => {
    return playersInfo.map(player => {
      let total = 0;
      evolutionData.forEach(yearData => {
        const stats = yearData[viewMode][player.id];
        if (stats && typeof stats[activeMetric] === 'number') {
          total += stats[activeMetric];
        }
      });
      return { name: player.name, color: player.color, value: total };
    }).sort((a, b) => b.value - a.value);
  }, [viewMode, activeMetric]);

  // Aplana os dados para o Recharts desenhar as linhas corretamente
  const chartData = useMemo(() => {
    return evolutionData.map(d => {
      const item = { year: d.year };
      playersInfo.forEach(p => {
        item[`${p.id}_val`] = d[viewMode][p.id]?.[activeMetric] || 0;
      });
      return item;
    });
  }, [viewMode, activeMetric]);

  const activeMetricLabel = METRICS.find(m => m.id === activeMetric)?.label || '';

  return (
    <div className="dashboard-container">

      {/* TABS DE NAVEGAÇÃO PRINCIPAL */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            background: 'transparent', color: activeTab === 'dashboard' ? '#fff' : '#8a8f98',
            border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
            borderBottom: activeTab === 'dashboard' ? '2px solid #3b82f6' : 'none', paddingBottom: '0.5rem'
          }}
        >
          Gráfico Comparativo
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          style={{
            background: 'transparent', color: activeTab === 'matches' ? '#fff' : '#8a8f98',
            border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
            borderBottom: activeTab === 'matches' ? '2px solid #3b82f6' : 'none', paddingBottom: '0.5rem'
          }}
        >
          Jogos da Seleção
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <header className="header">
            <h1>Vamos aos dados...</h1>
            <p style={{ color: '#8a8f98', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
              Base de dados cobrindo os últimos 8 anos de Seleção e Clubes.
            </p>

            {/* SELETORES GLOBAIS (CONTEXTO E MÉTRICA) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', maxWidth: '800px', margin: '0 auto' }}>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setViewMode('selecao')}
                  style={{
                    padding: '0.5rem 1.5rem', borderRadius: '999px', fontWeight: 'bold', cursor: 'pointer', border: 'none', transition: '0.3s',
                    background: viewMode === 'selecao' ? '#FDE047' : 'rgba(255,255,255,0.1)',
                    color: viewMode === 'selecao' ? '#000' : '#8a8f98'
                  }}
                >
                  Filtro: Seleção Brasileira
                </button>
                <button
                  onClick={() => setViewMode('clubes')}
                  style={{
                    padding: '0.5rem 1.5rem', borderRadius: '999px', fontWeight: 'bold', cursor: 'pointer', border: 'none', transition: '0.3s',
                    background: viewMode === 'clubes' ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                    color: viewMode === 'clubes' ? '#fff' : '#8a8f98'
                  }}
                >
                  Filtro: Clubes
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <SlidersHorizontal size={20} color="#8a8f98" />
                <strong style={{ color: '#fff' }}>Escolha o Dado a Analisar:</strong>
                <select
                  value={activeMetric}
                  onChange={(e) => setActiveMetric(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #334155', outline: 'none', cursor: 'pointer', fontSize: '1rem' }}
                >
                  {availableMetrics.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

            </div>
          </header>

          <main className="bento-grid">

            {/* GRÁFICO 1: EVOLUÇÃO TEMPORAL */}
            <section className="bento-item item-large">
              <h2 className="section-title"><CalendarDays size={24} /> Linha do Tempo: {activeMetricLabel}</h2>
              <p className="text-content" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Selecione até 5 jogadores abaixo para cruzar as curvas no período de 8 anos.
              </p>

              {/* PLAYER SELECTOR */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {playersInfo.map(player => {
                  const isSelected = selectedPlayers.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      style={{
                        padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
                        border: `1px solid ${isSelected ? player.color : 'rgba(255,255,255,0.1)'}`,
                        background: isSelected ? `${player.color}20` : 'transparent',
                        color: isSelected ? player.color : '#8a8f98',
                        fontWeight: isSelected ? 'bold' : 'normal',
                      }}
                    >
                      {player.name}
                    </button>
                  )
                })}
              </div>

              <div className="chart-container" style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="year" stroke="#8a8f98" />
                    <YAxis stroke="#8a8f98" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {selectedPlayers.map(id => {
                      const player = playersInfo.find(p => p.id === id);
                      return (
                        <Line key={id} type="monotone" dataKey={`${id}_val`} name={player.name} stroke={player.color} strokeWidth={id === 'neymar' ? 4 : 3} dot={{ r: 5 }} />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* GRÁFICO 2: RANKING GERAL DINÂMICO */}
            <section className="bento-item item-small">
              <h2 className="section-title"><Trophy size={24} /> Ranking 8 Anos: {activeMetricLabel}</h2>
              <div className="chart-container" style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentRanking} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#8a8f98" />
                    <YAxis dataKey="name" type="category" stroke="#8a8f98" width={90} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={activeMetricLabel} radius={[0, 4, 4, 0]}>
                      {currentRanking.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ===== ARGUMENTOS DO GRUPO ===== */}
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬 O Debate do Grupo</h2>
              <p style={{ color: '#8a8f98', fontSize: '0.9rem' }}>Cada card representa um argumento real do grupo, com quem falou e a análise dos dados.</p>
            </div>

            {/* A FAVOR */}
            <ArgumentCard
              category="favor"
              title="A Vontade e o Sonho"
              author="Bento"
              quote="Pode falar o que quiser, mas pra mim o Ney ainda é um dos que mais tem vontade quando tá na seleção. Mesmo manco, confio mais nele na área num jogo de mata-mata."
              icon={Activity}
              analysis="<p><strong>Análise:</strong> A 'Vontade' é subjetiva, mas a <strong>Disponibilidade Física</strong> é matemática. Selecione essa métrica no topo: a curva do Neymar despenca para 12% em 2023 e 25% em 2024. 'Confiar manco' numa Copa significa desperdiçar uma vaga com um atleta que entregou quase 0 minutos competitivos nos últimos 2 anos.</p>"
            />

            <ArgumentCard
              category="favor"
              title="O Cérebro Insubstituível"
              author="Impera"
              quote="Ngm tem o cérebro que ele tem dentro de campo. O cara acha espaço que ngm enxerga. Igual jogo contra Croácia."
              icon={Brain}
              analysis="<p><strong>Análise:</strong> De fato, selecione <strong>Chances Criadas</strong> e <strong>Passes Progressivos</strong> e veja o Neymar de 2018–2022: era o motor criativo absoluto. Mas os mesmos dados mostram que Raphinha (130 chances em 2024) e Estêvão (180 SCA em 2024) já superaram esse nível — com a vantagem de estarem fisicamente inteiros.</p>"
            />

            <ArgumentCard
              category="favor"
              title="O Paradão na Área"
              author="Bento"
              quote="Eu levaria o Ney, mandaria ele jogar só dentro da área ali, se poupar. Colocava os outros pra correr por ele, e deixava ele com experiência e qualidade na hora da finalização."
              icon={Target}
              analysis="<p><strong>Análise:</strong> Contradição tática. O impacto do Neymar nunca foi finalizar da pequena área — foi a construção. Selecione <em>Assistências</em>: ele era o armador. Se jogar fixo na área, quem constrói até ele? Além disso, seus <strong>xG</strong> recentes (0 em 2024/25) mostram que ele simplesmente não está em posições de finalização.</p>"
            />

            <ArgumentCard
              category="favor"
              title="Guardar pra Copa"
              author="Bento"
              quote="Só falta a copa pra coroar a carreira do cara. Sabendo que ele tá podre, em ano de copa, vc acha mesmo que ele vai dar o sangue no Paulistão!?"
              icon={Shield}
              analysis="<p><strong>Análise:</strong> Tese arriscada. Selecione <strong>Jogos Disputados</strong> e veja que de 2023 a 2025/26 o Neymar acumulou apenas ~41 jogos em 3 anos. Um atleta que não joga não pode simplesmente 'ligar' para uma Copa. O corpo precisa de ritmo competitivo — não existe botão de ativar.</p>"
            />

            {/* CONTRA */}
            <ArgumentCard
              category="contra"
              title="Colapso Físico Total"
              author="Nilo e R. Junior"
              quote="Neymar não aguenta... fisicamente ele não dá. Não adianta a cabeça pensar e o corpo não acompanhar. Ponto!"
              icon={HeartPulse}
              analysis="<p><strong>Análise:</strong> Tese perfeitamente alinhada com os dados. A <strong>Disponibilidade Física</strong> caiu de 50-70% para 12% (2023) e 25% (2024). O apagão a partir de 2023 nos gráficos (selecione qualquer métrica) não é mau momento — é colapso estrutural causado por ACL + lesões recorrentes.</p>"
            />

            <ArgumentCard
              category="contra"
              title="Europa vai Amassar"
              author="R. Junior"
              quote="Olha o jogo de ontem. A França brincou no campo. Vc acha que o Neymar ia fazer o que lá? Vc acha que os caras não vão jantar o Ney?"
              icon={Zap}
              analysis="<p><strong>Análise:</strong> O futebol europeu de 2026 exige intensidade sem bola. Selecione <strong>Dribles Certos</strong>: o Neymar saiu de 130 (2019) para 50 (2025). Compare com Vini Jr (140) e Raphinha (60 mesmo lesionado). Adversários de elite como França exigem pressão constante — algo fisicamente impossível para o Neymar atual.</p>"
            />

            <ArgumentCard
              category="contra"
              title="Não Joga pro Time"
              author="Jo e Nilo"
              quote="Neymar, se for convocado, vai ficar tentando se provar. Vai ficar segurando a bola, centralizando no meio, tomando falta e reclamando de cartão."
              icon={ShieldAlert}
              analysis="<p><strong>Análise:</strong> Compare os <strong>Passes Progressivos</strong> do Neymar (80 em 2025/26 no Santos) com Raphinha (150), Paquetá (120) e até o Estêvão (140). O jogo coletivo do Brasil moderno não pode girar em torno de um jogador que centraliza posse em ritmo lento contra times que pressionam alto.</p>"
            />

            <ArgumentCard
              category="contra"
              title="Foco Fora do Futebol"
              author="Jo e Vito"
              quote="O maluco quer saber a próxima mina que ele vai pegar, Kings League... Mano, Neymar meteu canal no YouTube 2 meses antes da copa. Ney é fanfarrão."
              icon={Flame}
              analysis="<p><strong>Análise:</strong> Subjetivo, mas refletido nos números. Enquanto Raphinha acumulou <strong>56 GA</strong> em 2024/25 (temporada de consagração) e Igor Thiago 22 GA como artilheiro da PL, o Neymar fez 4 GA no mesmo período. Comprometimento se mede em produtividade — e a dele despencou.</p>"
            />

            <ArgumentCard
              category="contra"
              title="O Tempo Passou"
              author="Jo e Vito"
              quote="34 anos pra provar... Para. Botava os mlk pra jogar que tem muito mais pra provar que o Neymar. Todo jogo grande o Neymar tava machucado!"
              icon={Clock}
              analysis="<p><strong>Análise:</strong> Selecione <strong>Participações (G+A)</strong> e compare a ascensão de Estêvão (28 GA em 2025/26 aos 18 anos), João Pedro (28 GA) e Igor Thiago (22 GA) com a queda livre de Neymar (9 GA). A nova geração já produz mais, e cada vaga desperdiçada com o passado é uma chance tirada do futuro.</p>"
            />

            <ArgumentCard
              category="contra"
              title="Europa vs Santos Rebaixado"
              author="Jo"
              quote="Todos esses estão jogando em time disputando título na Europa e o Neymar na zona de rebaixamento do Brasileirão."
              icon={Repeat}
              analysis="<p><strong>Análise:</strong> Troque para <strong>Clubes</strong> e compare: Vini Jr tem 31 GA na temporada pelo Real Madrid, Raphinha 22 pelo Barcelona, Igor Thiago 22 pelo Brentford. Neymar tem 9 GA jogando no Santos que foi rebaixado. A disparidade de nível competitivo é abissal.</p>"
            />

            {/* DÚVIDA */}
            <ArgumentCard
              category="duvida"
              title="A Ilusão do Passado"
              author="R. Junior e Nilo"
              quote="O Ney é assim: colocar com 25 do segundo tempo e sem obrigação de voltar. O problema é que a gente vive o Neymar do passado."
              icon={Eye}
              analysis="<p><strong>Análise:</strong> Argumento honesto. Selecione qualquer métrica e olhe 2018–2022: Neymar era um monstro (36 GA em 2018, 35 em 2022 por clubes). Mas olhe 2023–2026: é outro jogador. Os dados não mentem — o Neymar do passado era incrível, o do presente entrega uma fração daquilo.</p>"
            />

            <ArgumentCard
              category="duvida"
              title="Com ou Sem, Tá Ruim"
              author="Bento e Nilo"
              quote="Não admitir que sem o Ney o Brasil é mais fraco é sacanagem. Mas ilusão é acreditar que ele vai diferenciar kkkk."
              icon={HelpCircle}
              analysis="<p><strong>Análise:</strong> Ponto válido dos dois lados. A Seleção sem Neymar em 2024/25 tem jogadores que produzem mais em volume (Raphinha 9 GA, Vini 3 GA pela seleção). Mas o 'fator decisão' em mata-mata é intangível. Os dados mostram que o Brasil <em>pode</em> jogar bem sem ele (Copa América 2019, amistoso vs Inglaterra 2024).</p>"
            />
          </main>
        </>
      )}

      {activeTab === 'matches' && (
        <>
          <header className="header" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <h1 style={{ fontSize: '2.5rem' }}>"Me fala 1 jogo, só 1"</h1>
            <p style={{ color: '#8a8f98', fontSize: '1.1rem', maxWidth: '800px', marginTop: '1rem' }}>
              Buscando um <strong>"Jogo Grande onde o Brasil jogou bem sem o Neymar?"</strong><br />

            </p>
          </header>

          <div className="bento-grid">
            {matchHistory.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}

export default App;
