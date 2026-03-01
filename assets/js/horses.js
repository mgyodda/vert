(function(){
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

  async function load(){
    const grid = $('#horsesGrid');
    if(!grid) return;

    const res = await fetch('assets/data/horses.json', {cache:'no-store'});
    const horses = await res.json();

    function card(h){      return `<article class="card horse-card" >
        <div class="media" style="background-image:url('${h.cover||''}')"></div>
        <div class="body">
          <h3>${h.name}</h3>
          <p>${h.tagline||''}</p>
          <div class="meta small">${h.sex||''} • ${h.age||''} • ${h.height||''} • Цена: ${h.price||'по запросу'}</div>
          <div class="actions">
            <a class="btn-secondary" href="horse.html?id=${encodeURIComponent(h.id)}" data-goal="sale_open_card">Подробнее</a>
          </div>
        </div>
      </article>`;
    }

    function render(list){
      grid.innerHTML = list.map(card).join('');
    }

    render(horses);

    const chips = $$('.filters .chip');
    chips.forEach(ch=>{
      ch.addEventListener('click', ()=>{
        chips.forEach(x=>x.classList.remove('is-active'));
        ch.classList.add('is-active');
        const f = ch.getAttribute('data-filter');
        if(!f || f==='all') return render(horses);
        render(horses.filter(h=> (h.level||[]).includes(f)));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', load);
})();
