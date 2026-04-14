// カテゴリーごとの色設定
const categoryColors = {
    レイヤー: '#7FFF00', ブロック: '#e74c3c', 文字: '#f39c12', 削除: '#FF1493',
    コピー: '#8A2BE2', 寸法: '#00FFFF', レイアウト: '#FF00FF', ポリライン: '#FFFF00',
    属性: '#00FF00', 設定: '#FF4500', 尺度: '#FFB6C1', ファイル: '#E6E6FA'
};

function getCategoryColor(cat) { return categoryColors[cat] || '#808080'; }

let tools = [];
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

        updateSortButton(); 
        draw();

    } catch (e) {
        console.error(e);
    }
}

// CSV
function parseCSV(text) {
    return text.split('\n').filter(l => l.trim()).map(line => {
        let cells = [], curr = '', inQuote = false;
        for (let c of line) {
            if (c === '"') inQuote = !inQuote;
            else if (c === ',' && !inQuote) { cells.push(curr); curr=''; }
            else curr += c;
        }
        cells.push(curr);
        return cells;
    });
}

// ボタン表示
function updateSortButton() {
    const labels = {
        name: '名前順',
        date: '新着順',
        category: 'カテゴリー順',
        recommend: 'おすすめ順'
    };
    document.getElementById('sortToggle').textContent =
        `${labels[sortMode]} ${sortAsc ? '↑' : '↓'}`;
}

// 描画（★完全統一版）
function draw(query = '') {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = tools.filter(t => 
        (t.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (t.command || '').toLowerCase().includes(query.toLowerCase()) ||
        (t.tags && t.tags.some(tag => tag.includes(query)))
    );

    // カテゴリー件数
    const countMap = {};
    filtered.forEach(t => {
        const cat = t.category || 'その他';
        countMap[cat] = (countMap[cat] || 0) + 1;
    });

    // ソート
    filtered.sort((a, b) => {

        if (sortMode === 'name') {
            return sortAsc
                ? (a.name || '').localeCompare(b.name || '')
                : (b.name || '').localeCompare(a.name || '');
        }

        if (sortMode === 'date') {
            return sortAsc
                ? (a.date || '').localeCompare(b.date || '')
                : (b.date || '').localeCompare(a.date || '');
        }

        if (sortMode === 'recommend') {
            const countA = (a.status || '').split('★').length - 1;
            const countB = (b.status || '').split('★').length - 1;
            return sortAsc ? countA - countB : countB - countA;
        }

        if (sortMode === 'category') {
    const countA = countMap[a.category] || 0;
    const countB = countMap[b.category] || 0;

    // ★ここが重要（昇順・降順を分岐）
    const diff = sortAsc
        ? countA - countB   // 少ない → 多い
        : countB - countA;  // 多い → 少ない

    if (diff !== 0) return diff;

    // 同数なら名前順（ここも方向合わせる）
    return sortAsc
        ? (a.name || '').localeCompare(b.name || '')
        : (b.name || '').localeCompare(a.name || '');
}

        return 0;
    });

    // 表示（全モード共通）
    filtered.forEach(t => {
        const color = getCategoryColor(t.category);
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `10px solid ${color}`;
        card.onclick = () => openModal(t);

        const stars = (t.status || '');

        card.innerHTML = `
            <div class="card-star">${stars}</div>
            <div class="category" style="color:${color}">${t.category}</div>
            <div class="name" style="--cat-color:${color}">${t.name}</div>
            <div class="desc">${t.desc}</div>
            <div class="card-tags">
                ${(t.tags || []).map(tag => `<span class="card-tag">#${tag}</span>`).join('')}
            </div>
        `;

        grid.appendChild(card);
    });
}

// モーダル
function openModal(o) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = `
        <h2>${o.name} <small>(${o.command})</small></h2>
        <p>${o.desc}</p>
        <div class="modal-grid">
            <div><h4>Before</h4><img src="${o.before}" style="width:100%"></div>
            <div><h4>After</h4><img src="${o.after}" style="width:100%"></div>
        </div>
        <div class="modal-footer">
            <a href="${o.file}" class="btn-main" download>ダウンロード</a>
        </div>
    `;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// イベント
const search = document.getElementById('search');
const sortToggle = document.getElementById('sortToggle');

search.oninput = e => draw(e.target.value);

sortToggle.onclick = () => {
    const modes = ['name','date','category','recommend'];
    sortMode = modes[(modes.indexOf(sortMode)+1)%modes.length];
    updateSortButton();
    draw(search.value);
};

sortToggle.oncontextmenu = e => {
    e.preventDefault();
    sortAsc = !sortAsc;
    updateSortButton();
    draw(search.value);
};

window.addEventListener('keydown', e => {
    if (e.key === '/') search.focus();
    if (e.key === 'Escape') closeModal();
});

// 開始
init();