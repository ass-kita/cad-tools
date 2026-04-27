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
        // CSV読み込みなどの初期化処理
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

        // ① ソートボタン更新
        updateSortButton();

        // ② メイングリッド描画
        draw();

        // ③ 最近の履歴を描画
        loadRecent();  // ←ここで呼び出し

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

    let history = JSON.parse(localStorage.getItem('recent') || '[]');
    history = history.filter(item => item.name !== o.name);
   history.unshift(o);
    history = history.slice(0, 10);
    localStorage.setItem('recent', JSON.stringify(history));
    
    loadRecent(); // 保存した直後に描画を更新する

    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');

const stepsHtml = (o.steptext || '')
    .split('|')
    .map(s => `<li>${s}</li>`)
    .join('');

body.innerHTML = `
    <h2>${o.name} <small>(${o.desc})</small></h2>
    <p>${o.memo}</p>

    <h3>手順</h3>
    <ol>${stepsHtml}</ol>
        <div class="modal-grid">
            <div>
  <h4>Before</h4>
  ${o.before 
    ? `<img src="${o.before}" style="width:100%" onerror="this.outerHTML='<p>（準備中）</p>'">`
    : `<p>（準備中）</p>`
  }
</div>

<div>
  <h4>After</h4>
  ${o.after 
    ? `<img src="${o.after}" style="width:100%" onerror="this.outerHTML='<p>（準備中）</p>'">`
    : `<p>（準備中）</p>`
  }
</div>
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

document.getElementById('modal').addEventListener('click', function(e) {
    // モーダルの中身以外をクリックしたら閉じる
    if (e.target === this) {
        closeModal();
    }
});

document.getElementById('guideModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

document.querySelector('#modal .close').addEventListener('click', closeModal);

document.querySelector('#guideModal .guide-close')
    .addEventListener('click', function() {
        document.getElementById('guideModal').classList.add('hidden');
    });




// イベント
const search = document.getElementById('search');
const sortToggle = document.getElementById('sortToggle');

search.oninput = e => draw(e.target.value);

// 「アップロード手順」ボタンのクリックイベントを追加
document.getElementById('guideBtn').onclick = () => {
    document.getElementById('guideModal').classList.remove('hidden');
};

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
    if (e.key === '/') {
        e.preventDefault(); 
        search.focus();
    }
    if (e.key === 'Escape') closeModal();
});

// 開始
init();

loadRecent();

// 履歴を読み込んで描画する関数
function loadRecent() {
    const history = JSON.parse(localStorage.getItem('recent') || '[]');
    const section = document.getElementById('recentSection');
    const grid = document.getElementById('recentGrid');
    
    if (!grid) return;
    if (history.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = history.map(t => `
        <div class="card-mini" onclick='openModal(${JSON.stringify(t)})'>
            <div style="font-weight:bold; font-size:0.9rem;">${t.name}</div>
            <div class="card-tag" style="color:${getCategoryColor(t.category)}">● ${t.category}</div>
        </div>
    `).join('');
}

// 履歴クリアボタンの処理
document.getElementById('clearRecentBtn').onclick = () => {
    localStorage.removeItem('recent');
    loadRecent();
};