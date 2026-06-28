const UI = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FileBeam ⚡</title>
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      --glass-card: rgba(30, 41, 59, 0.45);
      --glass-border: rgba(255, 255, 255, 0.08);
      --card-stroke: rgba(0, 0, 0, 0.3);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #007aff;
      --accent-hover: #1a85ff;
      --folder: #ffb000;
      --file: #007aff;
      --danger: #ef4444;
      --danger-hover: #dc2626;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg-gradient); color: var(--text); padding: 40px 16px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; background-attachment: fixed; }
    header { width: 100%; max-width: 580px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .logo { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text); }
    .badge { font-size: 0.75rem; background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 6px 14px; border-radius: 10px; color: var(--text); font-weight: 500; border: 1px solid var(--glass-border); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    
    .card { background: var(--glass-card); backdrop-filter: blur(30px) saturate(200%); -webkit-backdrop-filter: blur(30px) saturate(200%); border: 1px solid var(--glass-border); border-top: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; padding: 24px; width: 100%; max-width: 580px; margin-bottom: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 1px 2px var(--card-stroke); position: relative; }
    .section-title { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 18px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
    
    .breadcrumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 0.85rem; margin-bottom: 16px; background: rgba(0, 0, 0, 0.2); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); }
    .crumb { color: var(--text-muted); cursor: pointer; text-decoration: none; padding: 2px 6px; border-radius: 4px; transition: all 0.1s; }
    .crumb:hover { color: var(--text); background: rgba(255,255,255,0.06); }
    .crumb.active { color: var(--text); font-weight: 600; cursor: default; background: none; }

    .explorer-list { display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.15); border-radius: 10px; overflow: hidden; border: 1px solid var(--glass-border); }
    .explorer-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: transparent; transition: background 0.15s; border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
    .explorer-row:last-child { border-bottom: none; }
    .explorer-row:hover { background: rgba(0, 122, 255, 0.15); }
    .explorer-row.clickable { cursor: pointer; }

    .explorer-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    .icon { font-size: 1.3rem; flex-shrink: 0; }
    .item-info { display: flex; flex-direction: column; min-width: 0; }
    .item-name { font-size: 0.9rem; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }

    .dl-btn { background: var(--accent); color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; text-decoration: none; font-weight: 500; transition: background 0.15s ease; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25); }
    .dl-btn:hover { background: var(--accent-hover); }

    #dz { border: 1px dashed rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(0, 0, 0, 0.1); margin-bottom: 16px; }
    #dz.dragover { border-color: var(--accent); background: rgba(0, 122, 255, 0.05); }
    
    .btn-group { display: flex; gap: 10px; width: 100%; }
    #ubtn { flex: 1; padding: 14px; border: none; border-radius: 10px; background: var(--accent); color: #fff; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.15s ease; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3); }
    #ubtn:disabled { opacity: 0.25; cursor: not-allowed; background: #475569; color: #94a3b8; box-shadow: none; }
    #ubtn:not(:disabled):hover { background: var(--accent-hover); }

    #cbtn { display: none; padding: 14px 20px; border: none; border-radius: 10px; background: var(--danger); color: #fff; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.15s ease; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
    #cbtn:hover { background: var(--danger-hover); }

    /* Performance Progress Metrics UI */
    .progress-wrapper { display: none; margin-top: 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 14px; border-radius: 12px; }
    .progress-metrics { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px; }
    .metrics-row { display: flex; justify-content: space-between; }
    .progress-bar-container { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; position: relative; }
    .progress-bar-fill { width: 0%; height: 100%; background: var(--accent); border-radius: 10px; transition: width 0.1s ease; }
    #status-text { font-weight: 600; color: var(--text); }
    #size-text { font-variant-numeric: tabular-nums; color: var(--text-muted); }

    .uploading-target-banner { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 4px; }
    .uploading-target-banner strong { color: var(--text); font-weight: 600; }
  </style>
</head>
<body>

  <header>
    <div class="logo">FileBeam ⚡</div>
    <div class="badge" id="mac-dir-title">...</div>
  </header>

  <div class="card" id="upload-card">
    <div class="section-title">📥 Send Files to Mac</div>
    <div class="uploading-target-banner">Destination: <strong id="upload-path-label">/ (Root)</strong></div>
    <div id="dz">
      <input type="file" id="fi" multiple style="display:none"/>
      <p style="color:var(--text-muted); font-size: 0.9rem;" id="dz-tx"><b>Tap to browse files</b> or drop items here</p>
    </div>
    <div class="btn-group">
      <button id="ubtn" disabled>Upload Files</button>
      <button id="cbtn">Cancel</button>
    </div>
    
    <div class="progress-wrapper" id="p-wrap">
      <div class="progress-metrics">
        <div class="metrics-row">
          <span id="status-text">Preparing...</span>
          <span id="size-text">0 B / 0 B</span>
        </div>
        <div class="metrics-row">
          <span id="metric-stats">0 MB/s · --s left</span>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" id="p-fill"></div>
      </div>
    </div>
  </div>

  <div class="card" id="download-card">
    <div class="section-title">📤 Explore Mac Files</div>
    <div class="breadcrumbs" id="breadcrumbs"></div>
    <div class="explorer-list" id="explorer-root"></div>
  </div>

  <script>
    const dz = document.getElementById('dz'), fi = document.getElementById('fi'), ubtn = document.getElementById('ubtn'), cbtn = document.getElementById('cbtn');
    const pWrap = document.getElementById('p-wrap'), pFill = document.getElementById('p-fill'), statusTxt = document.getElementById('status-text'), sizeTxt = document.getElementById('size-text'), metricStats = document.getElementById('metric-stats');
    let selectedFiles = [];
    let fileTreeData = [];
    let currentPath = [];
    let currentXhr = null;

    function fmtB(b){ return b < 1024 ? b + ' B' : b < 1<<20 ? (b/1024).toFixed(1) + ' KB' : (b/(1<<20)).toFixed(1) + ' MB'; }
    function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

    dz.addEventListener('click', () => fi.click());
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dz.addEventListener(eventName, (e) => { e.preventDefault(); dz.classList.add('dragover'); }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dz.addEventListener(eventName, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }, false);
    });
    dz.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length) {
        fi.files = e.dataTransfer.files;
        fi.dispatchEvent(new Event('change'));
      }
    });

    fi.addEventListener('change', () => { 
      selectedFiles = [...fi.files]; 
      ubtn.disabled = selectedFiles.length === 0; 
      document.getElementById('dz-tx').innerHTML = \`<b>\${selectedFiles.length}</b> file\${selectedFiles.length > 1 ? 's' : ''} staged for transfer\`; 
    });

    // ── CANCEL ACTION TRIGGER ────────────────────────────────────────────────
    cbtn.addEventListener('click', () => {
      if (currentXhr) {
        currentXhr.abort();
      }
    });

    ubtn.addEventListener('click', () => {
      const fd = new FormData(); 
      selectedFiles.forEach(f => fd.append('files', f));
      const targetDir = currentPath.join('/');
      
      ubtn.disabled = true;
      cbtn.style.display = 'inline-block';
      pWrap.style.display = 'block';
      statusTxt.textContent = 'Beaming files...';
      sizeTxt.textContent = '0 B / 0 B';
      pFill.style.width = '0%';
      pFill.style.background = 'var(--accent)';

      const xhr = new XMLHttpRequest();
      currentXhr = xhr;
      const startTime = Date.now();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          pFill.style.width = percent + '%';
          
          // Display total data payload size context
          sizeTxt.textContent = \`\${fmtB(e.loaded)} / \${fmtB(e.total)}\`;
          
          // Math calculation for asynchronous network speeds
          const elapsedSec = (Date.now() - startTime) / 1000;
          const bytesPerSec = elapsedSec > 0 ? e.loaded / elapsedSec : 0;
          const speedMB = (bytesPerSec / (1024 * 1024)).toFixed(1);
          
          // ETA calculation
          const remainingBytes = e.total - e.loaded;
          const remainingTime = bytesPerSec > 0 ? Math.ceil(remainingBytes / bytesPerSec) : 0;
          const etaStr = remainingTime > 60 ? Math.floor(remainingTime/60) + 'm' : remainingTime + 's';

          statusTxt.textContent = \`Uploading (\${Math.round(percent)}%)\`;
          metricStats.textContent = \`\${speedMB} MB/s · \${etaStr} left\`;
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          pFill.style.width = '100%';
          pFill.style.background = '#34d399';
          statusTxt.textContent = '✓ Successfully transferred to Mac!';
          metricStats.textContent = 'Done';
          setTimeout(() => { pWrap.style.display = 'none'; }, 3000);
          resetUploadState();
          loadTree();
        } else {
          handleFail('✕ Transmission rejected or failed.');
        }
      };

      xhr.onerror = () => handleFail('✕ Transmission rejected or failed.');
      xhr.onabort = () => handleFail('✕ Transfer cancelled by user.');

      function handleFail(msg) {
        pFill.style.background = '#f87171';
        statusTxt.textContent = msg;
        metricStats.textContent = 'Stopped';
        resetUploadState();
        if (msg.includes('cancelled')) {
          setTimeout(() => { pWrap.style.display = 'none'; }, 3000);
        }
      }

      function resetUploadState() {
        currentXhr = null;
        selectedFiles = []; 
        fi.value = '';
        ubtn.disabled = true; 
        cbtn.style.display = 'none';
        document.getElementById('dz-tx').innerHTML = '<b>Tap to browse files</b> or drop items here';
      }

      xhr.open('POST', '/upload');
      xhr.setRequestHeader("x-target-dir", targetDir);
      xhr.send(fd);
    });

    function getNestedFiles() {
      let pointer = fileTreeData;
      for (let folder of currentPath) {
        const found = pointer.find(item => item.isDir && item.name === folder);
        if (found && found.children) pointer = found.children;
        else return [];
      }
      return pointer;
    }

    function renderBreadcrumbs() {
      const container = document.getElementById('breadcrumbs');
      let html = \`<span class="crumb \${currentPath.length === 0 ? 'active' : ''}" onclick="navigateTo(-1)">Root</span>\`;
      
      currentPath.forEach((folder, idx) => {
        html += \`<span style="color:var(--text-muted); font-size:0.8rem; user-select:none;"> / </span>\`;
        const isActive = idx === currentPath.length - 1;
        html += \`<span class="crumb \${isActive ? 'active' : ''}" onclick="navigateTo(\${idx})">\${esc(folder)}</span>\`;
      });
      
      container.innerHTML = html;
      document.getElementById('upload-path-label').textContent = currentPath.length === 0 ? '/ (Root)' : '/' + currentPath.join('/');
    }

    function navigateTo(index) {
      currentPath = index === -1 ? [] : currentPath.slice(0, index + 1);
      renderExplorer();
    }

    function enterFolder(folderName) {
      currentPath.push(folderName);
      renderExplorer();
    }

    function renderExplorer() {
      renderBreadcrumbs();
      const listContainer = document.getElementById('explorer-root');
      const items = getNestedFiles();
      
      if (!items || items.length === 0) {
        listContainer.innerHTML = \`<div class="explorer-row" style="justify-content:center; padding:32px; color:var(--text-muted); font-size:0.85rem;">Empty directory folder</div>\`;
        return;
      }
      
      let html = "";
      items.forEach(item => {
        if (item.isDir) {
          html += \`<div class="explorer-row clickable" data-folder="\${esc(item.name)}" onclick="enterFolder(this.dataset.folder)">
            <div class="explorer-left">
              <span class="icon">📁</span>
              <div class="item-info">
                <span class="item-name">\${esc(item.name)}/</span>
                <span class="item-meta">\${item.children ? item.children.length : 0} items inside</span>
              </div>
            </div>
            <span style="color:var(--text-muted); font-size:1.1rem; padding-right:4px;">&rarr;</span>
          </div>\`;
        } else {
          html += \`<div class="explorer-row">
            <div class="explorer-left">
              <span class="icon">📄</span>
              <div class="item-info">
                <span class="item-name">\${esc(item.name)}</span>
                <span class="item-meta">\${fmtB(item.size)}</span>
              </div>
            </div>
            <a class="dl-btn" href="/download?file=\${encodeURIComponent(item.relPath)}" download>Get</a>
          </div>\`;
        }
      });
      
      listContainer.innerHTML = html;
    }

    async function loadTree(){
      try {
        fileTreeData = await fetch('/files').then(r => r.json());
        renderExplorer();
      } catch(e){}
    }

    async function init(){
      const cfg = await fetch('/config').then(r => r.json());
      document.getElementById('mac-dir-title').textContent = "📦 " + cfg.folderName;
      if(cfg.getOnly) document.getElementById('upload-card').style.display = 'none';
      if(cfg.sendOnly) document.getElementById('download-card').style.display = 'none';
      loadTree();
    }
    init();
  </script>
</body>
</html>`;

module.exports = UI;