// 40x30 viewBox icons; stroke #3E3A39 1.7, round. Each returns inner SVG.
const S='stroke="#3E3A39" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const ICONS={
 plane:{k:/航班|機場|飛|BR2|flight/i,n:'飛機',s:`<path d="M5 18 L29 12 Q36 11 36 14.5 Q35 18 29 18 L12 21z" fill="#fff" ${S}/><path d="M17 15 L12 5 L17 5 L25 13z" fill="#fff" ${S}/><path d="M7 17 L4 12 L8 12 L11 16z" fill="#F2A497" ${S}/><path d="M2 22h8M5 25h6" stroke="#A8D3E6" stroke-width="1.7" stroke-linecap="round"/>`},
 waterfall:{k:/星耀|瀑布|雨漩渦|Jewel/i,n:'瀑布',s:`<path d="M4 8 Q20 -1 36 8" fill="#B9DAA5" ${S}/><path d="M20 6V24M16 8v14M24 8v14" stroke="#A8D3E6" stroke-width="2.4" stroke-linecap="round"/><path d="M10 26q10-4 20 0" fill="none" ${S}/>`},
 gardens:{k:/濱海灣|超級樹|花園|花穹|雲霧林|水舞|Garden/i,n:'超級樹',s:`<path d="M12 27 Q14 18 13 12M13 12 L8 6 Q13 3 18 6z" fill="#B9DAA5" ${S}/><path d="M28 27 Q26 18 27 12M27 12 L22 6 Q27 3 32 6z" fill="#B9DAA5" ${S}/><path d="M4 27h32" ${S}/><circle cx="20" cy="9" r="2" fill="#F6D27A" ${S}/>`},
 lantern:{k:/牛車水|燈飾|年貨|走春/i,n:'燈籠',s:`<path d="M20 3v4" ${S}/><ellipse cx="20" cy="15" rx="9" ry="8" fill="#E0554B" ${S}/><path d="M14 8q-2 7 0 14M26 8q2 7 0 14M20 7v16" fill="none" ${S}/><rect x="16" y="22" width="8" height="3" fill="#F6D27A" ${S}/><path d="M18 25v4M20 25v4M22 25v4" ${S}/>`},
 temple:{k:/古廟|廟|祈福/i,n:'廟宇',s:`<path d="M4 12 Q20 4 36 12 Q20 11 4 12z" fill="#F6D27A" ${S}/><path d="M8 14 Q20 8 32 14" fill="none" ${S}/><rect x="9" y="14" width="22" height="12" fill="#fff" ${S}/><rect x="17" y="18" width="6" height="8" rx="3" fill="#E0554B" ${S}/><path d="M3 27h34" ${S}/>`},
 hongbao:{k:/圍爐|年夜飯|守歲|撈魚生|Lo Hei/i,n:'紅包',s:`<rect x="10" y="3" width="20" height="24" rx="2" fill="#E0554B" ${S}/><path d="M10 11 Q20 17 30 11" fill="none" ${S}/><circle cx="20" cy="14" r="3.6" fill="#F6D27A" ${S}/>`},
 zipline:{k:/飛索|探險|Sea Forest/i,n:'飛索',s:`<path d="M3 6 L37 14" ${S}/><path d="M22 10 v6" ${S}/><circle cx="22" cy="19" r="2.6" fill="#fff" ${S}/><path d="M22 21.5v4M22 23l-4 3M22 23l4 3" fill="none" ${S}/><path d="M4 28h6M30 28h6" stroke="#B9DAA5" stroke-width="2.4" stroke-linecap="round"/>`},
 spa:{k:/按摩|SPA\b/i,n:'按摩',s:`<path d="M20 24 Q12 22 11 12 Q18 13 20 24z M20 24 Q28 22 29 12 Q22 13 20 24z M20 24 Q15 16 20 5 Q25 16 20 24z" fill="#F2A497" ${S}/><path d="M8 27h24" stroke="#A8D3E6" stroke-width="1.7" stroke-linecap="round"/>`},
 seafood:{k:/海鮮|龍蝦|Harbour Bay/i,n:'海鮮',s:`<ellipse cx="20" cy="17" rx="9" ry="6.5" fill="#F2A497" ${S}/><path d="M11 14 Q4 12 5 6 Q10 6 12 11M29 14 Q36 12 35 6 Q30 6 28 11" fill="#F2A497" ${S}/><circle cx="17" cy="14" r="1" fill="#3E3A39"/><circle cx="23" cy="14" r="1" fill="#3E3A39"/><path d="M12 22l-3 4M16 23l-1 4M24 23l1 4M28 22l3 4" fill="none" ${S}/>`},
 beach:{k:/海灘|泳池|兒童俱樂部|放空|度假|慢時光/i,n:'海灘',s:`<circle cx="31" cy="7" r="4" fill="#F6D27A" ${S}/><path d="M11 25 Q12 14 10 8" fill="none" ${S}/><path d="M10 8 Q4 6 3 11M10 8 Q15 4 19 8M10 8 Q6 11 5 15" fill="none" ${S}/><path d="M3 26q4-3 8 0t8 0 8 0 8 0" fill="none" stroke="#A8D3E6" stroke-width="2" stroke-linecap="round"/>`},
 ferry:{k:/渡輪|碼頭|Ferry/i,n:'渡輪',s:`<path d="M4 20h32l-5 7H9z" fill="#fff" ${S}/><path d="M10 20v-6h18l4 6" fill="#A8D3E6" ${S}/><rect x="14" y="16" width="4" height="3" fill="#fff" ${S}/><rect x="21" y="16" width="4" height="3" fill="#fff" ${S}/><path d="M16 14V8h6v6" fill="#F2A497" ${S}/><path d="M3 29q3-2 6 0t6 0 6 0 6 0 6 0" fill="none" stroke="#A8D3E6" stroke-width="1.7" stroke-linecap="round"/>`},
 kopi:{k:/早茶|茶餐|咖椰|吐司|咖啡/i,n:'咖啡',s:`<path d="M7 11h20v8a8 7 0 0 1-20 0z" fill="#fff" ${S}/><path d="M27 13h3a3.5 3.5 0 0 1 0 7h-3" fill="none" ${S}/><path d="M12 8q2-3 0-5M18 8q2-3 0-5" fill="none" stroke="#F2A497" stroke-width="1.7" stroke-linecap="round"/><path d="M5 28h24" ${S}/>`},
 food:{k:/餐|肉骨茶|熟食|美食|吃|午餐|晚餐|早餐|food/i,n:'料理',s:`<path d="M6 15h28a14 11 0 0 1-28 0z" fill="#fff" ${S}/><path d="M10 12q2-4 0-7M17 12q2-4 0-7M24 12q2-4 0-7" fill="none" stroke="#F2A497" stroke-width="1.7" stroke-linecap="round"/><path d="M26 6 L33 2" ${S}/>`},
 bed:{k:/飯店|住宿|休息|check|hotel/i,n:'住宿',s:`<rect x="4" y="14" width="32" height="8" rx="2" fill="#A8D3E6" ${S}/><rect x="6" y="9" width="10" height="5" rx="2" fill="#fff" ${S}/><path d="M4 22v4M36 22v4" ${S}/>`},
 walk:{k:/./,n:'散步',s:`<circle cx="20" cy="6" r="3" fill="#fff" ${S}/><path d="M20 9v8l-4 8M20 17l4 8M14 12l6 2 5-3" fill="none" ${S}/>`}
};
function pickIcons(items){
 const text=items.map(i=>i.name+' '+(i.addr||'')).join(' ');
 const order=['waterfall','gardens','lantern','temple','hongbao','zipline','spa','seafood','beach','ferry','kopi','plane','food','bed'];
 const hit=order.filter(k=>ICONS[k].k.test(text));
 const pri=hit.filter(k=>!['food','bed','plane'].includes(k));
 const pick=(pri.length?pri:hit).slice(0,2);
 return pick.length?pick:['walk'];
}
function dayIllus(items){
 const ks=pickIcons(items),names=ks.map(k=>ICONS[k].n).join('與');
 const inner=ks.length===1?ICONS[ks[0]].s:`<g transform="translate(-1 3) scale(.62)">${ICONS[ks[0]].s}</g><g transform="translate(19 3) scale(.62)">${ICONS[ks[1]].s}</g>`;
 return `<svg viewBox="0 0 40 30" role="img" aria-label="${names}"><title>${names}</title>${inner}</svg>`;
}
const BRAND=`<svg viewBox="0 0 251 66" role="img" aria-label="超級樹、渡輪、廟宇與椰子樹" class="brand-svg"><g stroke="#3E3A39" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M4 62H247" fill="none"/>
<path d="M14 62Q18 40 16 26M16 26L6 14Q16 8 28 14z" fill="#B9DAA5"/><path d="M42 62Q38 44 40 32M40 32L30 20Q41 14 52 20z" fill="#B9DAA5"/><circle cx="28" cy="10" r="3" fill="#F6D27A"/>
<g class="brand-train"><path d="M70 50H136L128 60H78z" fill="#fff"/><path d="M80 50V38H122L130 50" fill="#A8D3E6"/><rect x="88" y="42" width="8" height="6" fill="#fff"/><rect x="102" y="42" width="8" height="6" fill="#fff"/><path d="M92 38V28H108V38" fill="#F2A497"/></g>
<path d="M146 36Q172 22 198 36Q172 34 146 36z" fill="#F6D27A"/><rect x="152" y="38" width="40" height="20" fill="#fff"/><rect x="167" y="44" width="10" height="14" rx="5" fill="#E0554B"/><path d="M148 36Q172 26 196 36" fill="none"/>
<path d="M222 62Q226 44 224 30" fill="none"/><path d="M224 30Q212 22 206 28M224 30Q234 20 244 26M224 30Q222 18 232 14M224 30Q214 32 210 40" fill="none"/><circle cx="236" cy="48" r="5" fill="#F6D27A"/><circle cx="228" cy="34" r="3" fill="#E0554B"/>
</g></svg>`;
