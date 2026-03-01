(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

  // UTM capture (Yandex Direct)
  function getUTM(){
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    let has = false;
    keys.forEach(k=>{
      const v = params.get(k);
      if(v){ utm[k]=v; has = true; }
    });
    if(has){
      try{ localStorage.setItem('ksk_utm', JSON.stringify(utm)); }catch(e){}
      return utm;
    }
    try{
      const saved = localStorage.getItem('ksk_utm');
      if(saved) return JSON.parse(saved);
    }catch(e){}
    return {};
  }
  const UTM = getUTM();

  // Metrika helper (set data-metrika-id on <body>)
  function reachGoal(goal){
    const id = document.body && document.body.getAttribute('data-metrika-id');
    if(window.ym && id){
      try{ window.ym(Number(id), 'reachGoal', goal); }catch(e){}
    }
  }

  // Mobile menu
  const burger = $('#burger');
  const panel = $('#mobilePanel');
  if(burger && panel){
    burger.addEventListener('click', ()=>{
      panel.classList.toggle('in');
      burger.setAttribute('aria-expanded', panel.classList.contains('in') ? 'true' : 'false');
    });
  }

  // Sticky mobile bar CTA click goals
  $$('.sticky-bar a').forEach(a=>{
    a.addEventListener('click', ()=>{
      const g = a.getAttribute('data-goal');
      if(g) reachGoal(g);
    });
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, {threshold: 0.12});
  $$('.reveal').forEach(el=>io.observe(el));

  // Gallery modal (image/video)
  const modal = $('#modal');
  const modalFrame = $('#modalFrame');
  const modalTitle = $('#modalTitle');
  const closeBtn = $('#modalClose');

  function openModal(src, title, type){
    if(!modal || !modalFrame) return;
    modalFrame.innerHTML = '';
    if(type === 'video'){
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      modalFrame.appendChild(iframe);
    }else{
      const div = document.createElement('div');
      div.className = 'modal-img';
      div.style.backgroundImage = `url('${src}')`;
      modalFrame.appendChild(div);
    }
    if(modalTitle) modalTitle.textContent = title || (type==='video' ? 'Видео' : 'Фото');
    modal.classList.add('in');
    document.body.style.overflow = 'hidden';
    reachGoal(type==='video' ? 'open_video' : 'open_gallery');
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove('in');
    if(modalFrame) modalFrame.innerHTML = '';
    document.body.style.overflow = '';
  }
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  if(modal) modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

  document.addEventListener('click', (e)=>{
    const el = e.target.closest('.gitem');
    if(!el) return;
    const src = el.getAttribute('data-src');
    const title = el.getAttribute('data-title');
    const type = el.getAttribute('data-type') || 'image';
    if(src) openModal(src, title, type);
  });

  // Lead form (individual approach, no popups)
  const form = $('#leadForm');
  if(form){
    const status = $('#formStatus');
    function setStatus(text, ok=true){
      if(!status) return;
      status.textContent = text;
      status.classList.toggle('ok', !!ok);
      status.classList.toggle('bad', !ok);
      status.style.display = 'block';
    }

    // click-to-call and click-to-route goals
    $$('.track-call').forEach(a=>a.addEventListener('click', ()=>reachGoal('call_click')));
    $$('.track-route').forEach(a=>a.addEventListener('click', ()=>reachGoal('route_click')));

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const name = ($('#name')||{}).value || '';
      const phone = ($('#phone')||{}).value || '';
      const service = ($('#service')||{}).value || '';
      const comment = ($('#comment')||{}).value || '';

      if(!phone.trim()){
        setStatus('Укажите телефон — и мы перезвоним.', false);
        return;
      }

      const utmLine = Object.keys(UTM).length ? ('\nUTM: ' + Object.entries(UTM).map(([k,v])=>`${k}=${v}`).join(' | ')) : '';
      const text =
`Заявка с сайта КСК «Вертикаль»
Имя: ${name}
Телефон: ${phone}
Интересует: ${service}
Комментарий: ${comment}${utmLine}`.trim();

      // Optional: send to Telegram (set data-telegram on form, e.g. data-telegram="YourUsername")
      const tg = form.getAttribute('data-telegram') || '';
      if(tg){
        const url = `https://t.me/${encodeURIComponent(tg)}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener');
      }else{
        // copy to clipboard so admin can paste anywhere (telegram / crm)
        try{ await navigator.clipboard.writeText(text); }catch(err){}
      }

      reachGoal('lead_submit');
      setStatus('Готово! Мы получили запрос и свяжемся с вами. Если нужно срочно — нажмите «Позвонить».');

      form.reset();
    });
  }

  // Count-up
  function animateCount(el){
    const target = parseInt(el.getAttribute('data-count')||'0',10);
    if(!target || Number.isNaN(target)) return;
    const dur = 700;
    const start = performance.now();
    function tick(t){
      const p = Math.min(1, (t-start)/dur);
      el.textContent = String(Math.round(target*p));
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  $$('.n[data-count]').forEach(el=>{
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          animateCount(e.target);
          observer.disconnect();
        }
      });
    }, {threshold: .6});
    observer.observe(el);
  });

  // FAQ accordion
  $$('.faq-item .faq-q').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.closest('.faq-item');
      if(!item) return;
      const isOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach(x=>{ if(x!==item) x.classList.remove('open'); });
      item.classList.toggle('open', !isOpen);
    });
  });

  // Horses catalog rendering (horses.html)
  const horsesGrid = $('#horsesGrid');
  if(horsesGrid){
    const horses = [
      {id:'h1', name:'Граф', type:'смешанный', level:'прогулки/спорт', age:'7 лет', height:'165', sex:'мерин', price:'по запросу', tags:['уравновешенный','контактный'], img:'assets/img/old/sale.jpg', desc:'Хороший ход, спокойный характер. Подойдёт для тренировок и уверенных прогулок.'},
      {id:'h2', name:'Луна', type:'смешанный', level:'обучение', age:'9 лет', height:'158', sex:'кобыла', price:'по запросу', tags:['для новичка','мягкая'], img:'assets/img/old/g6.jpg', desc:'Очень аккуратная, любит внимание. Идеальна для первого “своего” партнёра.'},
      {id:'h3', name:'Север', type:'спорт', level:'прыжки', age:'6 лет', height:'170', sex:'мерин', price:'по запросу', tags:['энергичный','перспективный'], img:'assets/img/old/g1.jpg', desc:'Динамичный, с потенциалом. Для тех, кто хочет роста и эмоций от процесса.'}
    ];

    const filters = {
      type: $('#fType'),
      level: $('#fLevel'),
      q: $('#fQ')
    };

    function card(h){
      const el = document.createElement('article');
      el.className = 'horse-card reveal';
      el.innerHTML = `
        <div class="horse-media" style="background-image:url('${h.img}')"></div>
        <div class="horse-body">
          <div class="horse-top">
            <h3>${h.name}</h3>
            <span class="horse-price">${h.price}</span>
          </div>
          <p class="horse-desc">${h.desc}</p>
          <div class="horse-meta">
            <span>Возраст: <b>${h.age}</b></span>
            <span>Рост: <b>${h.height} см</b></span>
            <span><b>${h.sex}</b></span>
            <span>Уровень: <b>${h.level}</b></span>
          </div>
          <div class="horse-tags">${h.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
          <div class="horse-actions">
            <a class="cta small" href="#lead" data-prefill="${h.name}">Запросить видео/показ</a>
            <a class="cta secondary small track-call" href="tel:+79108630704">Позвонить</a>
          </div>
        </div>`;
      return el;
    }

    function match(h){
      const t = (filters.type && filters.type.value) || '';
      const l = (filters.level && filters.level.value) || '';
      const q = ((filters.q && filters.q.value) || '').toLowerCase().trim();
      if(t && h.type !== t) return false;
      if(l && !h.level.toLowerCase().includes(l)) return false;
      if(q){
        const hay = (h.name+' '+h.desc+' '+h.tags.join(' ')+' '+h.level+' '+h.type).toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    }

    function render(){
      horsesGrid.innerHTML = '';
      horses.filter(match).forEach(h=>horsesGrid.appendChild(card(h)));
      $$('.reveal', horsesGrid).forEach(el=>io.observe(el));
      // prefill lead form with horse name
      $$('.horse-actions [data-prefill]').forEach(a=>{
        a.addEventListener('click', ()=>{
          const name = a.getAttribute('data-prefill') || '';
          const service = $('#service');
          const comment = $('#comment');
          if(service) service.value = 'Продажа лошадей';
          if(comment) comment.value = `Интересует лошадь: ${name}. Хочу видео/показ.`;
          reachGoal('sale_interest');
        });
      });
    }

    ['change','input'].forEach(ev=>{
      if(filters.type) filters.type.addEventListener(ev, render);
      if(filters.level) filters.level.addEventListener(ev, render);
      if(filters.q) filters.q.addEventListener(ev, render);
    });

    render();
  }

})();
