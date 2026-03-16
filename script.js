function getCategoryColor(category) { return categoryColors[category] || '#808080'; }
const categoryColors = { レイヤー: '#7FFF00', ブロック: '#e74c3c', 文字: '#f39c12' , 削除: '#FF1493' , コピー: '#8A2BE2', 寸法: '#00FFFF', レイアウト: '#FF00FF', ポリライン: '#FFFF00' , 属性: '#00FF00' , 設定: '#FF4500' , 尺度: '#FFB6C1', 設定: '#FF4500' , 尺度: '#FFB6C1' , 切り取り: '#ADD8E6' , ハッチング: '#FFDAB9' , ツール: '#20B2AA' , グループ: '#00BFFF', 貼付: '#F08080' , ファイル: '#E6E6FA' , 図形: '#FFFACD' , チェック: '#FFA500' , 移動コピー: '#32CD32'    };

let tools = [];
let downloads = JSON.parse(localStorage.getItem('dl') || '{}');
let recentlyViewed = JSON.parse(localStorage.getItem('recent') || '[]');
let sortMode = 'name';

async function init() {
    try {
        const res = await fetch('data/tools.csv');
        const text = await res.text();
        const rows = parseCSV(text);
        const headers = rows.shift();
        tools = rows.map(r => {
            let o = {};
            headers.forEach((h, i) => { const k = h.trim(); if(k) o[k] = (r[i] || '').trim(); });
            o.tags = (o.tags || '').split('|').filter(x => x);
            o.steps = (o.steps || '').split('|').filter(x => x);
            o.steptext = (o.steptext || '').split('|');
            return o;
        });
        applySort();
        draw();
        drawTagCloud();
        drawRecentlyViewed();
    } catch (e) { console.error(e); }
}

document.getElementById('clearRecentBtn').onclick = () => {
    if (confirm('検索履歴をすべて削除しますか？')) {
        recentlyViewed = [];
        localStorage.removeItem('recent');
        drawRecentlyViewed();
    }
};

function parseCSV(text) {
    const rows = []; let row = []; let val = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') { q = !q; continue; }
        if (c === ',' && !q) { row.push(val); val = ''; continue; }
        if (c === '\n' && !q) { row.push(val); rows.push(row); row = []; val = ''; continue; }
        val += c;
    }
    if (val || row.length > 0) { row.push(val); rows.push(row); }
    return rows.filter(r => r.length > 1);
}

// キーボード操作の実装
window.addEventListener('keydown', e => {
    // [/] 検索フォーカス
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('search').focus();
    }
    // [ESC] モーダルを閉じる ＆ 検索をクリアしてトップに戻る
    if (e.key === 'Escape') {
        const isModalOpen = !document.getElementById('modal').classList.contains('hidden') || 
                            !document.getElementById('guideModal').classList.contains('hidden') ||
                            !document.getElementById('imgViewer').classList.contains('hidden');
        
        if (isModalOpen) {
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            document.getElementById('imgViewer').classList.add('hidden');
        } else {
            // モーダルが閉まっている時にESCを押すと検索リセット
            const s = document.getElementById('search');
            if (s.value !== '') {
                s.value = '';
                draw('');
                s.blur(); // フォーカスを外す
            }
        }
    }
    // [←/→] 手順スクロール
    const flow = document.querySelector('.steps-flow');
    if (flow && !document.getElementById('modal').classList.contains('hidden')) {
        if (e.key === 'ArrowRight') flow.scrollBy({ left: 280, behavior: 'smooth' });
        if (e.key === 'ArrowLeft') flow.scrollBy({ left: -280, behavior: 'smooth' });
    }
});

function drawTagCloud() {
    const cloud = document.getElementById('tagCloud');
    const allTags = [...new Set(tools.flatMap(t => t.tags))];
    cloud.innerHTML = allTags.map(tag => `<span class="tag" onclick="setSearch('${tag}')">#${tag}</span>`).join('');
}

function setSearch(val) {
    const s = document.getElementById('search');
    s.value = val;
    draw(val);
    window.scrollTo({top: 0, behavior: 'smooth'}); // タグクリック時に上部へ戻る
}

function drawRecentlyViewed() {
    const section = document.getElementById('recentSection');
    const grid = document.getElementById('recentGrid');
    if (recentlyViewed.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    grid.innerHTML = '';
    
   recentlyViewed.forEach(name => {
    const t = tools.find(x => x.name === name);
    if (!t) return;
    
    const themeColor = getCategoryColor(t.category);
    const card = document.createElement('div');
    card.className = 'card-mini';
    // 以下の1行を追加：ホバー時に文字色が変わるように情報をセット
    card.style.color = themeColor;
    card.style.borderLeft = `4px solid ${themeColor}`;
    card.onclick = () => openModal(t.name);
    card.innerHTML = `<div class="name">${t.name}</div>`;
    grid.appendChild(card);
});
}
function updateRecent(name) {
    recentlyViewed = [name, ...recentlyViewed.filter(n => n !== name)].slice(0, 5);
    localStorage.setItem('recent', JSON.stringify(recentlyViewed));
    drawRecentlyViewed();
}

function createCard(t, isMini = false) {
    const themeColor = getCategoryColor(t.category);
    const card = document.createElement('div');
    card.className = 'card';
    
    // 以下の1行を追加：カードの文字色情報をセット
    card.style.color = themeColor; 
    card.style.borderLeft = `10px solid ${themeColor}`;
    
    card.onclick = () => openModal(t.name);
    // ...
    card.innerHTML = `
        <div class="category" style="color:${themeColor}">${t.category}</div>
        <div class="name">${t.name}</div>
        ${!isMini ? `
            <div class="desc">${t.desc}</div>
            <div class="tags-container">
                ${t.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
        ` : ''}
    `;
    return card;
}

function draw(q = '') {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    const s = q.toLowerCase();
    tools.filter(t => {
        if (t.status === 'draft') return false;
        return t.name.toLowerCase().includes(s) || t.category.toLowerCase().includes(s) || 
               t.desc.toLowerCase().includes(s) || t.tags.some(tag => tag.toLowerCase().includes(s));
    }).forEach(t => grid.appendChild(createCard(t)));
}

function openModal(name) {
    const t = tools.find(x => x.name === name);
    if (!t) return;
    updateRecent(name);
    const themeColor = getCategoryColor(t.category);
    let stepsHTML = t.steps.map((src, i) => {
        const tag = src.toLowerCase().endsWith('.mp4') ? 
            `<video src="${src}" autoplay muted loop playsinline onclick="zoom('${src}', true)"></video>` :
            `<img src="${src}" onclick="zoom('${src}', false)">`;
        
        // i + 1 で 1から始まる番号を表示
        return `<div class="step-box">
                    <div class="step-number" style="font-weight:bold; margin-bottom:5px;">${i + 1}</div>
                    ${tag}
                    <div class="step-text">${t.steptext[i] || ''}</div>
                </div>`;
    }).join('');

document.getElementById('modal-body').innerHTML = `
    <div class="modal-title" style="color:${themeColor}">${t.name}</div>
    <p>${t.desc}</p>
    <div style="display:flex; align-items:baseline; gap:10px;">
        <h3 style="margin-bottom:0;">手順</h3>
        <span class="dl-note">※画像をクリックして拡大</span>
    </div>
    <div class="steps-flow">${stepsHTML}</div>
        <div class="compare" id="compareContainer">
            <img src="${t.before}" id="beforeImg"><div class="after" id="afterWrap"><img src="${t.after}"></div>
            <div class="slider" onmousedown="slide(event)"></div>
        </div>
        <div style="display:flex; gap:15px; margin-top:30px; align-items: flex-start;">
            <div>
                <button style="padding:12px 24px; background:${themeColor}; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="copyCommand('${t.command}')">Commandコピー</button>
            </div>
            <div>
                <a href="${t.file}" download style="text-decoration:none;">
                    <button style="padding:12px 24px; background:${themeColor}; border:none; color:white; border-radius:6px; font-weight:bold; cursor:pointer;">LISPダウンロード</button>
                </a>
                <span class="dl-note">※保存先を選びたい場合は右クリックから保存</span>
            </div>
        </div>
    `;
    document.getElementById('modal').classList.remove('hidden');
}

function slide(e) {
    const wrap = document.getElementById('compareContainer');
    const move = ev => {
        let x = Math.max(0, Math.min(ev.clientX - wrap.getBoundingClientRect().left, wrap.offsetWidth));
        document.getElementById('afterWrap').style.width = x + 'px';
        e.target.style.left = x + 'px';
    };
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
}

function zoom(src, isVideo) {
    const v = document.getElementById("imgViewer");
    v.innerHTML = isVideo ? `<video src="${src}" autoplay muted loop controls style="max-width:95%;"></video>` : `<img src="${src}" style="max-width:95%;">`;
    v.classList.remove("hidden");
}

function copyCommand(cmd) {
    navigator.clipboard.writeText(cmd).then(() => {
        const btn = event.target; const old = btn.innerText;
        btn.innerText = 'Copied!'; setTimeout(() => btn.innerText = old, 2000);
    });
}

function applySort() {
    if (sortMode === 'name') tools.sort((a,b) => a.name < b.name ? -1 : 1);
    else if (sortMode === 'date') tools.sort((a,b) => new Date(b.date) - new Date(a.date));
}

document.getElementById('search').oninput = e => draw(e.target.value);
document.getElementById('sortToggle').onclick = e => {
    sortMode = sortMode === 'name' ? 'date' : 'name';
    e.target.innerText = sortMode === 'name' ? '名前順 ↑' : '新着順 ↓';
    applySort(); draw(document.getElementById('search').value);
};
document.getElementById('guideBtn').onclick = () => document.getElementById('guideModal').classList.remove('hidden');
document.querySelector('.close').onclick = () => document.getElementById('modal').classList.add('hidden');
document.querySelector('.guide-close').onclick = () => document.getElementById('guideModal').classList.add('hidden');
window.onclick = e => { if(e.target.classList.contains('modal')) e.target.classList.add('hidden'); if(e.target.id === 'imgViewer') e.target.classList.add('hidden'); };

init();