// カテゴリーごとの色設定
const categoryColors = {
    レイヤー: '#7FFF00', ブロック: '#e74c3c', 文字: '#f39c12', 削除: '#FF1493',
    コピー: '#8A2BE2', 寸法: '#00FFFF', レイアウト: '#FF00FF', ポリライン: '#FFFF00',
    属性: '#00FF00', 設定: '#FF4500', 尺度: '#FFB6C1', ファイル: '#E6E6FA'
};

function getCategoryColor(cat) { return categoryColors[cat] || '#808080'; }

let tools = [];
let recentlyViewed = JSON.parse(localStorage.getItem('recent') || '[]');
let sortMode = 'name';
let sortAsc = true;

// 初期化
async function init() {
    try {
        const res = await fetch('data/tools.csv'); 
        const text = await res.text();
        const rows = parseCSV(text);
        const headers = rows.shift();
        
        tools = rows.map(r => {
            let o = {};
            headers.forEach((h, i) => { o[h.trim()] = (r[i] || '').trim(); });
            o.tags = (o.tags || '').split('|').filter(x => x);
            return o;
        });
        
        draw();
        
        // アップロード手順ボタンの設定
        const guideBtn = document.getElementById('guideBtn');
        if (guideBtn) guideBtn.onclick = openGuide;

    } catch (e) {
        console.error('データの読み込みに失敗しました:', e);
    }
}

// CSVパース
function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
        let cells = [];
        let curr = '';
        let inQuote = false;
        for (let char of line) {
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) { cells.push(curr); curr = ''; }
            else curr += char;
        }
        cells.push(curr);
        return cells;
    });
}

// 描画関数
function draw(query = '') {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    let filtered = tools.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.command.toLowerCase().includes(query.toLowerCase()) ||
        (t.tags && t.tags.some(tag => tag.includes(query)))
    );

    // ソート
    filtered.sort((a, b) => {
        let valA = a[sortMode === 'name' ? 'name' : 'date'] || '';
        let valB = b[sortMode === 'name' ? 'name' : 'date'] || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // カード生成
    filtered.forEach(t => {
        const color = getCategoryColor(t.category);
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `10px solid ${color}`;
        
        // ここでデータ全体を渡す
        card.onclick = () => openModal(t); 

        card.innerHTML = `
            <div class="category" style="color:${color}">${t.category}</div>
            <div class="name" style="--cat-color:${color}">${t.name}</div>
            <div class="desc">${t.desc}</div>
            <div class="card-tags">
                ${t.tags.map(tag => `<span class="card-tag">#${tag}</span>`).join('')}
            </div>
        `;
        grid.appendChild(card);
    });
}

// モーダルを開く
function openModal(o) {
    if (!o) return;
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    
    body.innerHTML = `
        <h2>${o.name} <small>(${o.command})</small></h2>
        <p>${o.desc}</p>
        <div class="modal-grid">
            <div>
                <h4>Before</h4>
                <img src="${o.before}" alt="Before" style="width:100%; cursor:pointer;" onclick="window.open(this.src)">
            </div>
            <div>
                <h4>After</h4>
                <img src="${o.after}" alt="After" style="width:100%; cursor:pointer;" onclick="window.open(this.src)">
            </div>
        </div>
        <div class="modal-footer">
            <a href="${o.file}" class="btn-main" download style="display:inline-block; padding:10px 20px; background:#00FFFF; color:#000; text-decoration:none; border-radius:5px; font-weight:bold;">LISPファイルをダウンロード</a>
        </div>
    `;
    modal.classList.remove('hidden');
}

function openGuide() {
    document.getElementById('guideModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('guideModal').classList.add('hidden');
}

// イベント
document.getElementById('search').oninput = (e) => draw(e.target.value);
document.querySelector('.close').onclick = closeModal;
document.querySelector('.guide-close').onclick = closeModal;

document.getElementById('sortToggle').onclick = () => {
    sortMode = (sortMode === 'name') ? 'date' : 'name';
    sortAsc = !sortAsc;
    document.getElementById('sortToggle').textContent = 
        `${sortMode === 'name' ? '名前順' : '新着順'} ${sortAsc ? '↑' : '↓'}`;
    draw(document.getElementById('search').value);
};

window.addEventListener('keydown', e => {
    if (e.key === '/') { e.preventDefault(); document.getElementById('search').focus(); }
    if (e.key === 'Escape') { closeModal(); }
});

// 開始
init();