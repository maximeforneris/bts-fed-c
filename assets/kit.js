/* ═══════════════════════════════════════════════════════════════════════
   KIT WEB — sommaire actif, replis, quiz et outils de calcul.
   Inline dans chaque page par webseance.py. Un outil s'appelle depuis le
   markdown par   ::: {.outil data-outil="paroi"}   :::
   Ajouter un outil = ajouter une entree dans OUTILS, rien d'autre.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ───────────────────────────────── formatage francais */
function fr(x,n){
  if(!isFinite(x))return "—";
  var s=Math.abs(x)<Math.pow(10,-n)/2?0:x;
  return s.toFixed(n).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g," ");
}
function frs(x,n){
  if(!isFinite(x))return "—";
  return (Math.abs(x)<Math.pow(10,-n)/2?0:x).toFixed(n).replace(".",",");
}
function E(t,a,h){var e=document.createElement(t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(h!==undefined)e.innerHTML=h;return e;}

/* État partagé : les outils se chaînent comme les séances.
   L'enchaînement est EXPLICITE et ordonné — paroi donne U, bilan donne GV,
   energie consomme GV. Un mécanisme d'abonnement se rappellerait lui-même. */
var ETAT={u_mur:0.30, gv:0, surface:0, phi:0};
function suivant(nom){var o=OUTILS[nom];if(o&&o._recalc)o._recalc();}

/* ───────────────────────────────── sommaire actif */
var liens=[].slice.call(document.querySelectorAll("nav.somm a"));
if(liens.length&&"IntersectionObserver" in window){
  var cibles=liens.map(function(a){return document.getElementById(a.getAttribute("href").slice(1));})
                  .filter(Boolean);
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      liens.forEach(function(a){
        a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id);});
    });
  },{rootMargin:"-45% 0px -50% 0px"});
  cibles.forEach(function(c){io.observe(c);});
}

/* ───────────────────────────────── quiz */
[].forEach.call(document.querySelectorAll(".quiz"),function(q){
  var items=[].slice.call(q.querySelectorAll("li"));
  var total=items.length, faits=0, justes=0;
  var chap=E("p",{"class":"chapeau"},"Vérifiez-vous — "+total+" questions");
  q.insertBefore(chap,q.firstChild);
  var score=E("p",{"class":"score"},"");
  items.forEach(function(li){
    /* « énoncé : bonne / mauvaise / mauvaise »  — le gras marque la bonne */
    var html=li.innerHTML;
    /* separateurs : " : " avant les reponses, " | " entre elles.
       Ni l'un ni l'autre n'apparait dans un enonce ou une reponse — ce que
       « / » ne garantissait pas : il coupait dans </strong> et dans R = 1 / U. */
    var coupe=html.lastIndexOf(" : ");
    var enonce=coupe>0?html.slice(0,coupe):html;
    var reps=(coupe>0?html.slice(coupe+3):"").split(/\s*\|\s*/);
    var bloc=E("div",{"class":"qq"});
    bloc.appendChild(E("p",{},enonce.trim()));
    var ch=E("div",{"class":"choix"});
    var repondu=false;
    reps.forEach(function(r){
      var juste=/<strong>/.test(r);
      var txt=r.replace(/<\/?strong>/g,"").trim();
      if(!txt)return;
      var b=E("button",{type:"button"},txt);
      b.addEventListener("click",function(){
        if(repondu)return;
        repondu=true;faits++;if(juste)justes++;
        [].forEach.call(ch.children,function(o){o.disabled=true;});
        b.classList.add(juste?"juste":"faux");
        if(!juste)[].forEach.call(ch.children,function(o,i){
          if(/<strong>/.test(reps[i]))o.classList.add("juste");});
        score.textContent=justes+" / "+faits+" — "+
          (faits<total?(total-faits)+" restantes":"terminé");
      });
      ch.appendChild(b);
    });
    bloc.appendChild(ch);
    q.appendChild(bloc);
  });
  var ul=q.querySelector("ul");if(ul)ul.remove();
  q.appendChild(score);
});

/* ───────────────────────────────── exercices
   L'exercice DIT SI C'EST JUSTE et rappelle la methode. Il ne donne jamais la
   valeur attendue ni la redaction : le corrige reste au polycopie. Voir
   GUIDE-WEB.md. La reponse voyage obscurcie dans data-a — de quoi ne pas
   tomber dessus en survolant la page, rien de plus. */
var socleExo=document.querySelector("[data-site]");
var CLE_EXO="fed."+(socleExo?socleExo.getAttribute("data-site"):"autonome")+".exo";
function exoLu(){try{return JSON.parse(localStorage.getItem(CLE_EXO)||"{}")||{};}
                 catch(e){return {};}}
/* L'evenement annonce aussi CE QUI A ETE TAPE et le genre du bloc. Le kit
   n'en fait rien ; comptes.js, charge sur un site a comptes, l'ecoute pour
   le recopier dans la base. Sans lui, ces deux champs ne vont nulle part. */
function exoNote(id,etat,valeur,genre){var t=exoLu();t[id]=etat;
  try{localStorage.setItem(CLE_EXO,JSON.stringify(t));}catch(e){}
  document.dispatchEvent(new CustomEvent("exo",{detail:{id:id,etat:etat,
    valeur:valeur===undefined?null:valeur,genre:genre||"exercice"}}));}
function aplat(s){
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function memeTexte(a,b){
  /* « 1,5 m », « 1,5m » et « 1.5 m » sont la meme reponse : l'eleve tape vite,
     et l'espace avant l'unite n'est pas ce qu'on evalue. */
  var x=aplat(a),y=aplat(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function aplatSignes(s){
  /* Comme aplat(), mais on GARDE les symboles qui portent le sens :
     + - * / ^ ( ) [ ] ; < > = et le point decimal. Sans eux, « 5x - 5 »
     et « 5x + 5 » deviennent la meme reponse, et « [0 ; 10[ » vaut
     « ]0 ; 10] ». Les variantes typographiques sont ramenees a la touche
     du clavier : moins, fois, divise, virgule decimale. */
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase()
         .replace(/[\u2212\u2013\u2014]/g,"-")
         .replace(/[\u00d7\u22c5\u2217]/g,"*")
         .replace(/[\u00f7\u2215]/g,"/")
         .replace(/,/g,".")
         .replace(/[^a-z0-9+\-*\/^()\[\];<>=.]+/g," ").trim();
}
function memeSignes(a,b){
  var x=aplatSignes(a),y=aplatSignes(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function nombre(s){
  /* « 1 376 » et « 1,38 » et « 1.38e3 » : l'eleve tape comme il veut */
  /* le moins typographique d'un clavier de tablette vaut le tiret du clavier */
  var t=s.replace(/\s/g,"").replace(",",".").replace(/[−–]/g,"-");   /* \s couvre U+00A0 et U+202F */
  return t===""?NaN:parseFloat(t);
}
[].forEach.call(document.querySelectorAll(".exo"),function(ex){
  var sec;try{sec=JSON.parse(atob(ex.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=ex.getAttribute("data-exo"), typ=sec.t;
  var indice=ex.querySelector(".indice"), liste=ex.querySelector(".verifier");
  var zone=E("div",{"class":"reponse"}), verdict=E("p",{"class":"verdict"},"");
  var champ, valider;

  if(typ==="justification"){
    champ=E("textarea",{rows:"4","aria-label":"Votre justification",
      placeholder:"Rédigez votre réponse, puis comparez-la aux points à vérifier."});
    valider=E("button",{type:"button","class":"btn"},"J’ai répondu");
  }else{
    champ=E("input",{type:"text",autocomplete:"off","aria-label":"Votre réponse",
      inputmode:typ==="calcul"?"decimal":"text",
      placeholder:typ==="calcul"?"Votre valeur":"Votre réponse"});
    valider=E("button",{type:"button","class":"btn"},"Vérifier");
  }
  var ligne=E("div",{"class":"saisie"});
  ligne.appendChild(champ);
  if(typ==="calcul"&&sec.u)ligne.appendChild(E("span",{"class":"unite"},sec.u));
  ligne.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    ligne.appendChild(bi);
  }
  zone.appendChild(ligne);zone.appendChild(verdict);
  ex.appendChild(zone);
  if(indice)ex.appendChild(indice);

  function juge(){
    if(typ==="justification"){
      /* rien a corriger automatiquement : on rend les points a verifier, et
         l'eleve se juge lui-meme. Les points disent QUOI verifier, pas la
         reponse. */
      if(!champ.value.trim()){verdict.className="verdict";
        verdict.textContent="Rédigez d’abord votre réponse.";return;}
      if(liste&&liste.hidden){
        liste.hidden=false;
        [].forEach.call(liste.children,function(li){
          var b=E("input",{type:"checkbox"});
          b.addEventListener("change",compte);
          li.insertBefore(b,li.firstChild);
        });
        ex.appendChild(liste);
        valider.textContent="Relire ma réponse";
      }
      compte();
      return;
    }
    var ok;
    if(typ==="calcul"){
      var v=nombre(champ.value);
      if(isNaN(v)){verdict.className="verdict";
        verdict.textContent="Entrez une valeur numérique.";return;}
      ok=sec.v!==null&&Math.abs(v-sec.v)<=Math.abs(sec.v)*(sec.tol/100);
    }else{
      var r=aplat(champ.value);
      ok=!!r&&(sec.a||[]).some(function(a){return aplat(a)===r;});
    }
    verdict.className="verdict "+(ok?"juste":"faux");
    verdict.textContent=ok?"C’est juste."
      :(typ==="calcul"?"Ce n’est pas la valeur attendue. Reprenez la méthode."
                      :"Ce n’est pas la réponse attendue.");
    exoNote(id,ok?"juste":"faux",champ.value,"exercice");
    if(!ok&&indice)indice.hidden=false;
  }
  function compte(){
    var b=liste?[].slice.call(liste.querySelectorAll("input")):[];
    var n=b.filter(function(x){return x.checked;}).length;
    verdict.className="verdict "+(n===b.length&&b.length?"juste":"");
    verdict.textContent=n+" point"+(n>1?"s":"")+" sur "+b.length+
      (n===b.length&&b.length?" — votre réponse est complète.":" à vérifier dans votre réponse.");
    exoNote(id,n===b.length&&b.length?"juste":"vu",champ.value,"justification");
  }
  valider.addEventListener("click",juge);
  champ.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&typ!=="justification"){e.preventDefault();juge();}
  });
  var fait=exoLu()[id];
  if(fait==="juste"){ex.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussi.";}
});



/* ───────────────────────────────── series d'entrainement
   Le pendant web du tableau a remplir du polycopie : une case par item, on
   remplit, on verifie tout d'un coup. Meme regle que l'exercice — la page dit
   juste ou faux et rappelle la methode, elle ne donne jamais la reponse.
   Une case fausse GARDE ce qui a ete tape : on corrige, on ne recommence pas. */
[].forEach.call(document.querySelectorAll(".serie"),function(se){
  var sec;try{sec=JSON.parse(atob(se.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=se.getAttribute("data-serie");
  var items=[].slice.call(se.querySelectorAll("ol.items > li"));
  var indice=se.querySelector(".indice"), cases=[];

  items.forEach(function(li,i){
    var d=(sec.i||[])[i]||{};
    var rep=E("span",{"class":"rep"});
    var inp=E("input",{type:"text",autocomplete:"off",
      inputmode:d.v!==undefined?"decimal":"text",
      "class":d.v!==undefined?"":"texte",
      "aria-label":"Réponse"});
    rep.appendChild(inp);
    if(sec.u)rep.appendChild(E("span",{"class":"unite"},sec.u));
    var mq=E("span",{"class":"marque"},"");
    rep.appendChild(mq);
    li.appendChild(rep);
    cases.push({e:inp,m:mq,d:d,li:li});
    inp.addEventListener("input",function(){
      li.classList.remove("juste","faux");mq.textContent="";
    });
    inp.addEventListener("keydown",function(ev){
      if(ev.key!=="Enter")return;
      ev.preventDefault();
      if(i+1<cases.length)cases[i+1].e.focus();else juger();
    });
  });

  function juste(d,txt){
    if(!txt.trim())return null;                    /* non traite */
    if(d.v!==undefined){
      var v=nombre(txt);
      if(isNaN(v))return false;
      return Math.abs(v-d.v)<=Math.abs(d.v)*(sec.tol/100)+1e-9;
    }
    var cmp=(sec.m==="signes")?memeSignes:memeTexte;
    return !!txt.trim()&&(d.a||[]).some(function(a){return cmp(a,txt);});
  }

  var verdict=E("p",{"class":"verdict"},"");
  var valider=E("button",{type:"button","class":"btn"},"Vérifier la série");
  var barre=E("div",{"class":"barre"});
  barre.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    barre.appendChild(bi);
  }
  se.appendChild(barre);se.appendChild(verdict);
  if(indice)se.appendChild(indice);

  function juger(){
    var bons=0,faux=0,vides=0;
    cases.forEach(function(c){
      var r=juste(c.d,c.e.value);
      c.li.classList.remove("juste","faux");
      if(r===null){vides++;c.m.textContent="";return;}
      if(r){bons++;c.li.classList.add("juste");c.m.textContent="✓";}
      else {faux++;c.li.classList.add("faux");c.m.textContent="✗";}
    });
    var tout=bons===cases.length;
    verdict.className="verdict "+(tout?"juste":(faux?"faux":""));
    var reste=[];
    if(faux)reste.push(faux+" à reprendre");
    if(vides)reste.push(vides+(vides>1?" non traitées":" non traitée"));
    verdict.textContent=tout
      ?"La série entière est juste."
      :bons+" sur "+cases.length+(reste.length?" — "+reste.join(", "):"")+".";
    if(tout)se.classList.add("fait");else se.classList.remove("fait");
    exoNote(id,tout?"juste":(faux?"faux":"vu"),
      bons+"/"+cases.length+" : "+cases.map(function(c){return c.e.value.trim()||"·";}).join(" | "),
      "serie");
    if(faux&&indice)indice.hidden=false;
  }
  valider.addEventListener("click",juger);

  if(exoLu()[id]==="juste"){
    se.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussie.";
  }
});

/* ═══════════════════════════════════════════════════ PSYCHROMETRIE
   Une seule implementation pour tout le depot. Pression atmospherique
   normale ; au-dela de 100 degres l'air ne sature plus, d'ou le garde-fou
   de rDe qui renverrait sinon une humidite absolue negative. */
var PATM=101325;
function pvs(t){return 610.94*Math.exp(17.625*t/(t+243.04));}      /* Pa */
function rDe(t,hr){                                                /* g/kg as */
  var p=hr/100*pvs(t);
  if(p>=PATM*0.999)return 1e4;
  return 622*p/(PATM-p);
}
function hrDe(t,r){var p=PATM*r/(622+r);return Math.min(100,100*p/pvs(t));}
function enth(t,r){return 1.006*t+r/1000*(2501+1.83*t);}           /* kJ/kg as */
function rosee(t,hr){
  var a=17.625,b=243.04,g=Math.log(Math.max(hr,0.01)/100)+a*t/(b+t);
  return b*g/(a-g);
}
function volSpec(t,r){return 287.06*(t+273.15)*(1+1.6078*r/1000)/PATM;}
function bulbeH(t,r){                                              /* dichotomie */
  var lo=-30,hi=t,m,i;
  for(i=0;i<60;i++){
    m=(lo+hi)/2;
    var rs=rDe(m,100)/1000;                                        /* kg/kg */
    var rc=(rs*(2501-2.326*m)-1.006*(t-m))/(2501+1.86*t-4.186*m);
    if(rc*1000>r)hi=m;else lo=m;
  }
  return m;
}
function tDeH(h,r){return (h-2.501*r)/(1.006+0.00183*r);}          /* adiabatique */

/* ═══════════════════════════════════════════════════ LA REMISE
   « ::: {.remise} » — l'eleve tape l'identifiant donne en classe et produit un
   FICHIER TEXTE de ses reponses. Tout se fabrique dans le navigateur : rien
   n'est envoye, rien n'est enregistre. Le fichier atterrit dans ses
   telechargements, et c'est lui qui le remet.

   Ce qui est collecte : les series et les exercices qui se trouvent entre le
   dernier titre de niveau 1 AVANT le bloc, et le bloc lui-meme. Un bilan pose
   sous « # Exercices bilan de sequence » ne ramasse donc pas les exercices de
   la seance qui le precede. */
[].forEach.call(document.querySelectorAll(".remise"),function(bl){

  /* --- la portee : du dernier h1 qui precede, jusqu'ici --- */
  function portee(){
    var tous=[].slice.call(document.querySelectorAll("h1, .serie, .exo"));
    var fin=tous.indexOf(bl), debut=0;
    if(fin<0){
      /* le bloc n'est pas dans la liste : on se repere sur sa position */
      fin=tous.length;
      for(var k=0;k<tous.length;k++){
        if(bl.compareDocumentPosition(tous[k])&Node.DOCUMENT_POSITION_PRECEDING)continue;
        fin=k;break;
      }
    }
    for(var i=fin-1;i>=0;i--){ if(tous[i].tagName==="H1"){debut=i+1;break;} }
    return tous.slice(debut,fin).filter(function(n){return n.tagName!=="H1";});
  }

  function titreDe(n){
    /* le titre d'un exercice et celui d'une serie sont des h4 ; le repli sur
       un <strong> attrapait le premier mot gras de l'enonce. */
    var t=n.querySelector("h3, h4, .titre-exo");
    return t?t.textContent.trim():"(sans titre)";
  }

  function lignesSerie(se){
    var out=["SÉRIE — "+titreDe(se),""];
    [].forEach.call(se.querySelectorAll("ol.items > li"),function(li,i){
      var inp=li.querySelector("input");
      var lib=li.cloneNode(true);
      var rep=lib.querySelector(".rep"); if(rep)rep.parentNode.removeChild(rep);
      var etat=li.classList.contains("juste")?"juste"
              :li.classList.contains("faux") ?"faux":"non vérifié";
      out.push("  "+(i+1)+". "+lib.textContent.replace(/\s+/g," ").trim());
      out.push("     réponse : "+((inp&&inp.value.trim())||"(vide)")+"   ["+etat+"]");
    });
    out.push("");
    return out;
  }

  function lignesExo(ex){
    var out=["EXERCICE — "+titreDe(ex),""];
    var champ=ex.querySelector("textarea, .saisie input");
    out.push("  réponse : "+((champ&&champ.value.trim())||"(vide)"));
    var liste=ex.querySelector(".verifier");
    if(liste&&!liste.hidden){
      var pts=[].slice.call(liste.children), n=0;
      pts.forEach(function(li){
        var cb=li.querySelector("input[type=checkbox]");
        var coche=cb&&cb.checked; if(coche)n++;
        var txt=li.cloneNode(true);
        var c=txt.querySelector("input"); if(c)c.parentNode.removeChild(c);
        out.push("     ["+(coche?"x":" ")+"] "+txt.textContent.replace(/\s+/g," ").trim());
      });
      out.splice(2,0,"  points retrouvés : "+n+" sur "+pts.length);
    }
    var v=ex.querySelector(".verdict");
    if(v&&v.textContent.trim())out.push("  verdict : "+v.textContent.trim());
    out.push("");
    return out;
  }

  function fabriquer(id){
    var titre=(document.querySelector("h1")||{textContent:"Bilan"}).textContent.trim();
    var onglet=document.title||titre;
    var d=new Date(), deux=function(n){return (n<10?"0":"")+n;};
    var out=["BILAN DE SÉQUENCE",
             "Page       : "+onglet,
             "Identifiant: "+id,
             "Date       : "+deux(d.getDate())+"/"+deux(d.getMonth()+1)+"/"+d.getFullYear()
                            +" à "+deux(d.getHours())+"h"+deux(d.getMinutes()),
             new Array(64).join("="), ""];
    var n=0;
    portee().forEach(function(el){
      if(el.classList.contains("serie")){out=out.concat(lignesSerie(el));n++;}
      else if(el.classList.contains("exo")){out=out.concat(lignesExo(el));n++;}
    });
    if(!n)out.push("(aucune réponse trouvée sur cette page)","");
    out.push(new Array(64).join("-"));
    out.push("Fichier produit dans le navigateur de l'élève.");
    out.push("Rien n'a été envoyé, rien n'a été enregistré ailleurs.");
    return out.join("\r\n");
  }

  function nettoie(s){
    return (s.normalize?s.normalize("NFD").replace(/[̀-ͯ]/g,""):s)
           .replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase()
           || "sans-identifiant";
  }

  /* --- l'interface --- */
  bl.appendChild(E("p",{"class":"remise-quoi"},
    "Tapez l’<b>identifiant donné en classe</b>, puis produisez le fichier. "+
    "Il se fabrique <b>dans votre navigateur</b> : rien n’est envoyé, rien n’est "+
    "enregistré. Le fichier part dans vos téléchargements, et c’est vous qui le remettez."));
  var ligne=E("div",{"class":"saisie"});
  var ident=E("input",{type:"text",autocomplete:"off","aria-label":"Identifiant",
    placeholder:"identifiant donné en classe"});
  var bouton=E("button",{type:"button","class":"btn"},"Produire mon fichier");
  var dit=E("p",{"class":"verdict"},"");
  ligne.appendChild(ident);ligne.appendChild(bouton);
  bl.appendChild(ligne);bl.appendChild(dit);

  bouton.addEventListener("click",function(){
    var id=ident.value.trim();
    if(!id){dit.className="verdict";dit.textContent="Tapez d’abord votre identifiant.";
      ident.focus();return;}
    var texte=fabriquer(id);
    try{
      var b=new Blob([texte],{type:"text/plain;charset=utf-8"});
      var u=URL.createObjectURL(b), a=E("a",{href:u,download:"bilan-"+nettoie(id)+".txt"});
      document.body.appendChild(a);a.click();
      document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(u);},2000);
      dit.className="verdict juste";
      dit.textContent="Fichier produit : bilan-"+nettoie(id)+".txt";
    }catch(e){
      dit.className="verdict faux";
      dit.textContent="Le navigateur a refusé le téléchargement. Recopiez vos réponses à la main.";
    }
  });
  ident.addEventListener("keydown",function(ev){
    if(ev.key==="Enter"){ev.preventDefault();bouton.click();}
  });
});



/* ═══════════════════════════════════════════════════ SCHEMAS
   Dessines ici, pas repris du polycopie : vectoriels, ils suivent le theme
   sombre, et « paroi-coupe » se redessine avec le composeur de paroi. */
var SCHEMAS={}, SCHEMA_MAJ=[];
/* declare ici : le schema des degres-jours s'en sert autant que l'outil */
var VILLES=[["Nice",1100],["Marseille",1300],["Bordeaux",1700],["Lyon",2200],
            ["Paris",2300],["Rouen",2400],["Strasbourg",2700],["Briançon",3800]];
var NS="http://www.w3.org/2000/svg";
function S(t,a,txt){
  var e=document.createElementNS(NS,t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function V(c){return "var(--"+c+")";}

/* ─────────── coupe de paroi, avec le profil de temperature ─────────── */
SCHEMAS["paroi-coupe"]=function(el){
  var W=724,H=318,X0=112,X1=606,Y0=52,Y1=206,FILM=24;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Coupe d'une paroi et profil de température"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);   /* apres la legende de l'auteur */

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var C=(ETAT.couches&&ETAT.couches.length)?ETAT.couches:[
      {nom:"Plaque de plâtre",lam:0.25,e:1.3,R:0.052},
      {nom:"Polystyrène",lam:0.035,e:10,R:2.857},
      {nom:"Parpaing creux",lam:1.05,e:20,R:0.190},
      {nom:"Enduit ciment",lam:1.15,e:1.5,R:0.013}];
    var rsi=0.13, rse=0.04;
    var rtot=rsi+rse; C.forEach(function(c){rtot+=c.R;});
    var ti=20, te=0, dt=ti-te;

    /* largeurs : epaisseurs a l'echelle, avec un minimum lisible */
    var dispo=X1-X0-2*FILM, som=0;
    C.forEach(function(c){som+=c.e;});
    var l=C.map(function(c){return Math.max(7,dispo*c.e/som);});
    var tot=0; l.forEach(function(x){tot+=x;});
    l=l.map(function(x){return x*dispo/tot;});

    function y(theta){return Y1-(theta-te)/dt*(Y1-Y0);}

    /* les deux films d'air superficiels */
    [[X0,FILM,"chaud"],[X1-FILM,FILM,"froid"]].forEach(function(f){
      svg.appendChild(S("rect",{x:f[0],y:Y0,width:f[1],height:Y1-Y0,
        fill:V(f[2]),opacity:"0.10"}));
    });

    /* les couches */
    var x=X0+FILM, bornes=[X0,X0+FILM];
    C.forEach(function(c,i){
      var iso=c.lam<0.06;
      svg.appendChild(S("rect",{x:x,y:Y0,width:l[i],height:Y1-Y0,
        fill:V(iso?"vert":"trait"),opacity:iso?"0.20":"0.13"}));
      svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1+8,
        stroke:V("trait"),"stroke-width":"1"}));
      if(l[i]>=15){
        var yn=Y1-10;
        var t=S("text",{x:x+l[i]/2,y:yn,"text-anchor":"start",
          "class":"s-nom",transform:"rotate(-90 "+(x+l[i]/2)+" "+yn+")"},
          c.nom.length>17?c.nom.slice(0,16)+"…":c.nom);
        svg.appendChild(t);
      }
      if(l[i]>=26)
        svg.appendChild(S("text",{x:x+l[i]/2,y:Y1+24,"text-anchor":"middle",
          "class":"s-pet"},frs(c.e,1)+" cm"));
      x+=l[i]; bornes.push(x);
    });
    bornes.push(X1);
    svg.appendChild(S("line",{x1:X1-FILM,y1:Y0,x2:X1-FILM,y2:Y1+8,
      stroke:V("trait"),"stroke-width":"1"}));

    /* le profil : la chute dans une couche est proportionnelle a sa resistance */
    var cum=0, pts=[[X0,y(ti)]];
    cum+=rsi; pts.push([X0+FILM,y(ti-dt*cum/rtot)]);
    C.forEach(function(c,i){
      cum+=c.R; pts.push([bornes[i+2],y(ti-dt*cum/rtot)]);
    });
    pts.push([X1,y(te)]);
    svg.appendChild(S("polyline",{points:pts.map(function(p){
      return p[0].toFixed(1)+","+p[1].toFixed(1);}).join(" "),
      fill:"none",stroke:V("chaud"),"stroke-width":"3","stroke-linejoin":"round"}));
    pts.forEach(function(p){
      svg.appendChild(S("circle",{cx:p[0],cy:p[1],r:"3.5",fill:V("chaud")}));
    });

    /* cadre et reperes */
    svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
      stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:X0-10,y:y(ti)+4,"text-anchor":"end","class":"s-lab"},
      "20 °C"));
    svg.appendChild(S("text",{x:X1+10,y:y(te)+4,"text-anchor":"start","class":"s-lab"},
      "0 °C"));
    svg.appendChild(S("text",{x:X0-10,y:Y0-14,"text-anchor":"end","class":"s-pet"},
      "intérieur"));
    svg.appendChild(S("text",{x:X1+10,y:Y0-14,"text-anchor":"start","class":"s-pet"},
      "extérieur"));
    svg.appendChild(S("text",{x:(X0+X1)/2,y:Y0-14,"text-anchor":"middle","class":"s-tit"},
      "PROFIL DE TEMPÉRATURE DANS LA PAROI"));
    svg.appendChild(S("text",{x:X0+FILM/2,y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      "Rsi"));
    svg.appendChild(S("text",{x:X1-FILM/2,y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      "Rse"));

    /* ce que le dessin montre, en toutes lettres */
    var pire=null;
    C.forEach(function(c){if(!pire||c.R>pire.R)pire=c;});
    lg.innerHTML="La pente est raide là où la résistance est grande. Ici <b>"+
      fr(100*pire.R/rtot,0)+" % de la chute</b> se fait dans une seule couche, "+
      pire.nom.toLowerCase()+" — et presque rien dans le reste du mur.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};

/* ─────────── l'echelle des conductivites ─────────── */
SCHEMAS["lambda-echelle"]=function(el){
  var W=680,H=204,X0=60,X1=620,Y=100;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Échelle des conductivités thermiques"});
  var min=Math.log10(0.02), max=Math.log10(200);
  function x(v){return X0+(Math.log10(v)-min)/(max-min)*(X1-X0);}
  svg.appendChild(S("rect",{x:X0,y:Y-9,width:x(0.05)-X0,height:18,
    fill:V("vert"),opacity:"0.22"}));
  svg.appendChild(S("text",{x:(X0+x(0.05))/2,y:Y-19,"text-anchor":"middle",
    "class":"s-tit",fill:V("vert")},"LES ISOLANTS"));
  svg.appendChild(S("line",{x1:X0,y1:Y,x2:X1,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  [0.02,0.1,1,10,100].forEach(function(v){
    svg.appendChild(S("line",{x1:x(v),y1:Y-7,x2:x(v),y2:Y+7,
      stroke:V("encre2"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x(v),y:Y+26,"text-anchor":"middle","class":"s-pet"},
      frs(v,v<1?2:0)));
  });
  svg.appendChild(S("text",{x:X0,y:Y+68,"text-anchor":"start","class":"s-pet"},
    "λ en W/(m·K) — échelle logarithmique"));
  [[0.025,"Polyuréthane",1],[0.038,"Laine minérale",0],[0.15,"Bois",1],
   [0.45,"Brique creuse",0],[1.65,"Béton",1],[50,"Acier",0]].forEach(function(m){
    var h=m[2]?-1:1, xx=x(m[0]);
    svg.appendChild(S("line",{x1:xx,y1:Y+h*8,x2:xx,y2:Y+h*30,
      stroke:V("trait"),"stroke-width":"1"}));
    svg.appendChild(S("circle",{cx:xx,cy:Y,r:"4",fill:V(m[0]<0.06?"vert":"froid")}));
    svg.appendChild(S("text",{x:xx,y:Y+h*40+(h<0?0:4),"text-anchor":"middle",
      "class":"s-nom"},m[1]));
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Du polyuréthane à l'acier, <b>un facteur 2 000</b>. C'est pourquoi l'échelle "+
    "est logarithmique : sur une échelle ordinaire, tous les isolants seraient "+
    "collés au zéro."));
};


/* ─────────── les trois modes de transfert ─────────── */
SCHEMAS["trois-modes"]=function(el){
  var W=720,H=330,XM=352,EP=64,Y0=54,Y1=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Conduction, convection et rayonnement sur une paroi"});

  /* les deux ambiances */
  svg.appendChild(S("rect",{x:0,y:Y0,width:XM,height:Y1-Y0,fill:V("chaud"),opacity:"0.07"}));
  svg.appendChild(S("rect",{x:XM+EP,y:Y0,width:W-XM-EP,height:Y1-Y0,
    fill:V("froid"),opacity:"0.09"}));
  svg.appendChild(S("text",{x:16,y:Y0-14,"class":"s-pet"},"INTÉRIEUR 20 °C"));
  svg.appendChild(S("text",{x:W-16,y:Y0-14,"text-anchor":"end","class":"s-pet"},
    "EXTÉRIEUR 0 °C"));

  /* la paroi */
  svg.appendChild(S("rect",{x:XM,y:Y0,width:EP,height:Y1-Y0,fill:V("trait"),
    opacity:"0.22"}));
  svg.appendChild(S("rect",{x:XM,y:Y0,width:EP,height:Y1-Y0,fill:"none",
    stroke:V("trait"),"stroke-width":"1.5"}));
  /* les hachures restent DANS la paroi : k borne aux deux extremites */
  for(var k=1;Y0+k*18+8<=Y1;k++)
    svg.appendChild(S("line",{x1:XM,y1:Y0+k*18+8,x2:XM+EP,y2:Y0+k*18-8,
      stroke:V("trait"),"stroke-width":"1",opacity:"0.6"}));

  function fleche(x1,y1,x2,y2,coul,ep){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-9*Math.cos(a),y2:y2-9*Math.sin(a),
      stroke:V(coul),"stroke-width":ep||2.5,"stroke-linecap":"round"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-11*Math.cos(a-0.42))+","+(y2-11*Math.sin(a-0.42))+
      "L"+(x2-11*Math.cos(a+0.42))+","+(y2-11*Math.sin(a+0.42))+"Z",fill:V(coul)}));
  }

  /* 1. conduction : a travers la matiere */
  [88,148,208].forEach(function(y){
    fleche(XM+6,y,XM+EP-6,y,"chaud",3);
  });
  svg.appendChild(S("text",{x:XM+EP/2,y:Y0-14,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"CONDUCTION"));

  /* 2. convection : l'air qui bouge le long de la paroi, et celui qui s'en va */
  svg.appendChild(S("path",{d:"M300,222 C262,222 262,150 300,150 C336,150 336,86 300,86",
    fill:"none",stroke:V("froid"),"stroke-width":"2.5","stroke-dasharray":"6 4"}));
  fleche(304,88,286,74,"froid",2.5);
  svg.appendChild(S("text",{x:258,y:250,"text-anchor":"middle","class":"s-tit",
    fill:V("froid")},"CONVECTION"));
  /* la bouche de ventilation traverse la paroi */
  svg.appendChild(S("rect",{x:XM-4,y:98,width:EP+8,height:26,fill:V("carte"),
    stroke:V("froid"),"stroke-width":"2"}));
  fleche(XM+EP+10,111,XM+EP+52,111,"froid",2.5);
  svg.appendChild(S("text",{x:XM+EP+58,y:115,"class":"s-nom",fill:V("froid")},
    "air extrait"));

  /* 3. rayonnement : sans support, du corps chaud vers la paroi froide */
  svg.appendChild(S("rect",{x:96,y:130,width:26,height:76,rx:3,fill:V("chaud"),
    opacity:"0.30",stroke:V("chaud"),"stroke-width":"2"}));
  svg.appendChild(S("text",{x:109,y:224,"text-anchor":"middle","class":"s-nom"},
    "radiateur"));
  [150,168,186].forEach(function(y){
    var d="M130,"+y, x=130;
    for(var i=0;i<5;i++){
      d+=" q9,-7 18,0 q9,7 18,0";
      x+=36;
    }
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V("tiede"),"stroke-width":"2"}));
    fleche(x-4,y,x+14,y,"tiede",2);
  });
  svg.appendChild(S("text",{x:212,y:126,"text-anchor":"middle","class":"s-tit",
    fill:V("tiede")},"RAYONNEMENT"));

  svg.appendChild(S("text",{x:W/2,y:H-16,"text-anchor":"middle","class":"s-nom"},
    "Le coefficient U englobe les trois : un seul nombre pour trois phénomènes."));
  el.appendChild(svg);
};

/* ─────────── les degres-jours, ville par ville ─────────── */
SCHEMAS["dju-villes"]=function(el){
  var W=700,H=260,X0=118,X1=572,Y0=26;   /* place pour l etiquette a droite */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Degrés-jours unifiés par ville"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var choisie=ETAT.ville===undefined?0:ETAT.ville;
    var mx=0; VILLES.forEach(function(v){if(v[1]>mx)mx=v[1];});
    var h=26, pas=(H-Y0-24)/VILLES.length;
    VILLES.forEach(function(v,i){
      var y=Y0+i*pas, l=(X1-X0)*v[1]/mx, sel=(i===choisie);
      svg.appendChild(S("text",{x:X0-12,y:y+h/2+4,"text-anchor":"end",
        "class":sel?"s-lab":"s-nom"},v[0]));
      svg.appendChild(S("rect",{x:X0,y:y,width:l,height:h,rx:2,
        fill:V(sel?"chaud":"froid"),opacity:sel?"0.85":"0.28"}));
      svg.appendChild(S("text",{x:X0+l+9,y:y+h/2+4,"class":"s-pet"},
        fr(v[1],0)+" DJU"));
    });
    var v=VILLES[choisie];
    lg.innerHTML="À bâtiment identique, la consommation de chauffage suit les "+
      "degrés-jours. <b>"+v[0]+"</b> en compte "+fr(v[1],0)+" ; Briançon en compte "+
      fr(3800/v[1],1)+" fois plus.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};


/* ─────────── la double etiquette du DPE ─────────── */
/* Seuils : arrete du 31 mars 2021, cas general. La classe retenue est la plus
   mauvaise des deux — c'est tout l'objet de ce schema. */
var DPE=[
 {c:"A",cep:70, ges:6,  e:"#2e8b3d",g:"#ece9f4"},
 {c:"B",cep:110,ges:11, e:"#6bb43a",g:"#d5cee8"},
 {c:"C",cep:180,ges:30, e:"#b5cf3c",g:"#bab0da"},
 {c:"D",cep:250,ges:50, e:"#f2d81f",g:"#8878c4"},
 {c:"E",cep:330,ges:70, e:"#f0a52a",g:"#6f5ab4"},
 {c:"F",cep:420,ges:100,e:"#e6702c",g:"#57409f"},
 {c:"G",cep:1e9,ges:1e9,e:"#d02b20",g:"#3d2a80"}
];
SCHEMAS["dpe-etiquette"]=function(el){
  var W=700,H=372,Y0=64,HB=34,PAS=42;
  var saisie=E("div",{style:"display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px"});
  var etat={cep:180,ges:35};
  [["cep","Consommation","kWh/m²·an",0,600],
   ["ges","Émissions","kg CO₂/m²·an",0,150]].forEach(function(f){
    var w=E("label",{style:"display:flex;align-items:center;gap:7px;font-size:14.5px"});
    w.appendChild(E("span",{},f[1]));
    var i=E("input",{type:"number",min:f[3],max:f[4],step:"1",value:etat[f[0]]});
    i.addEventListener("input",function(){
      var v=parseFloat(this.value);
      if(isFinite(v)){etat[f[0]]=Math.max(f[3],Math.min(f[4],v));dessine();}});
    w.appendChild(i);
    w.appendChild(E("span",{"class":"mono",style:"color:var(--encre2);font-size:12.5px"},f[2]));
    saisie.appendChild(w);
  });
  el.appendChild(saisie);
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Double étiquette du DPE, énergie et climat"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  function classe(val,cle){
    for(var i=0;i<DPE.length;i++)if(val<DPE[i][cle])return i;
    return 6;
  }
  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var ie=classe(etat.cep,"cep"), ig=classe(etat.ges,"ges");
    var pire=Math.max(ie,ig);
    [[48,"ÉNERGIE","kWh/m²·an","e","cep",ie],
     [408,"CLIMAT","kg CO₂/m²·an","g","ges",ig]].forEach(function(col){
      var x0=col[0];
      svg.appendChild(S("text",{x:x0,y:26,"class":"s-tit"},col[1]));
      svg.appendChild(S("text",{x:x0,y:46,"class":"s-pet"},col[2]));
      DPE.forEach(function(d,i){
        var y=Y0+i*PAS, l=130+i*22, sel=(i===col[5]);
        svg.appendChild(S("path",{d:"M"+x0+","+y+"h"+(l-18)+"l18,"+(HB/2)+
          "l-18,"+(HB/2)+"H"+x0+"Z",fill:d[col[3]],
          stroke:sel?V("encre"):"none","stroke-width":sel?"2.5":"0"}));
        var clair=(col[3]==="e")?(i>=2&&i<=4):(i<=2);
        svg.appendChild(S("text",{x:x0+14,y:y+HB/2+6,"class":"s-lab",
          fill:clair?"#1a1a1a":"#ffffff"},d.c));
        var borne=i===0?("< "+DPE[0][col[4]])
          :i===6?("> "+DPE[5][col[4]])
          :(DPE[i-1][col[4]]+" à "+d[col[4]]);
        svg.appendChild(S("text",{x:x0+l-26,y:y+HB/2+5,"text-anchor":"end",
          "class":"s-pet",fill:clair?"#333333":"#f4f4f4"},borne));
        if(sel)svg.appendChild(S("text",{x:x0+l+14,y:y+HB/2+5,"class":"s-lab"},"◀"));
      });
    });
    lg.innerHTML="Consommation en <b>"+DPE[ie].c+"</b>, émissions en <b>"+DPE[ig].c+
      "</b> : le logement est classé <b>"+DPE[pire].c+"</b>. "+
      "<b>La plus mauvaise des deux l'emporte</b>"+
      (pire===ig&&ig>ie?" — ici c'est le carbone qui déclasse, pas l'isolation."
       :pire===ie&&ie>ig?" — ici c'est la consommation."
       :" — les deux tombent dans la même classe.")+
      (pire>=5?" Au-delà de F, on parle de passoire thermique.":"");
  }
  dessine();
};

/* ─────────── chaine d'energie et chaine d'information ─────────── */
SCHEMAS["deux-chaines"]=function(el){
  var W=760,H=352;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Chaîne d'énergie et chaîne d'information"});
  function boite(x,y,l,h,titre,ex,coul){
    svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,rx:3,fill:V(coul),
      opacity:"0.13"}));
    svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x+l/2,y:y+21,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    ex.split("|").forEach(function(m,k){
      svg.appendChild(S("text",{x:x+l/2,y:y+40+k*15,"text-anchor":"middle",
        "class":"s-nom"},m));
    });
  }
  function fl(x1,y1,x2,y2,coul){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-8*Math.cos(a),y2:y2-8*Math.sin(a),
      stroke:V(coul),"stroke-width":"2.5"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-10*Math.cos(a-0.4))+","+(y2-10*Math.sin(a-0.4))+
      "L"+(x2-10*Math.cos(a+0.4))+","+(y2-10*Math.sin(a+0.4))+"Z",fill:V(coul)}));
  }
  /* le couloir entre les deux rangees accueille les deux liaisons :
     les ordres a y=152, le compte rendu a y=190. Rien ne croise un titre. */
  var YI=44, YE=244, HB=74;
  function coude(pts,coul){
    var d="M"+pts[0][0]+","+pts[0][1];
    for(var i=1;i<pts.length;i++)d+="L"+pts[i][0]+","+pts[i][1];
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V(coul),"stroke-width":"2.5",
      "stroke-linejoin":"round"}));
    var a=pts[pts.length-1], b=pts[pts.length-2];
    var an=Math.atan2(a[1]-b[1],a[0]-b[0]);
    svg.appendChild(S("path",{d:"M"+a[0]+","+a[1]+
      "L"+(a[0]-10*Math.cos(an-0.4))+","+(a[1]-10*Math.sin(an-0.4))+
      "L"+(a[0]-10*Math.cos(an+0.4))+","+(a[1]-10*Math.sin(an+0.4))+"Z",fill:V(coul)}));
  }
  svg.appendChild(S("text",{x:14,y:26,"class":"s-tit",fill:V("froid")},
    "CHAÎNE D'INFORMATION — elle transporte la décision"));
  [[74,"ACQUÉRIR","sonde de départ|sonde extérieure"],
   [292,"TRAITER","régulateur|automate"],
   [510,"COMMUNIQUER","GTB, superviseur|Modbus, BACnet"]].forEach(function(b){
    boite(b[0],YI,176,HB,b[1],b[2],"froid");
  });
  fl(250,YI+HB/2,292,YI+HB/2,"froid");
  fl(468,YI+HB/2,510,YI+HB/2,"froid");

  svg.appendChild(S("text",{x:14,y:YE-14,"class":"s-tit",fill:V("chaud")},
    "CHAÎNE D'ÉNERGIE — elle transporte la puissance"));
  [[14,"ALIMENTER","réseau de chaleur"],
   [170,"DISTRIBUER","vanne 3 voies|motorisée"],
   [326,"CONVERTIR","échangeur|circulateur"],
   [482,"TRANSMETTRE","réseau de|tuyauteries"]].forEach(function(b){
    boite(b[0],YE,140,HB,b[1],b[2],"chaud");
  });
  [156,312,468].forEach(function(x){fl(x,YE+HB/2,x+14,YE+HB/2,"chaud");});

  /* la matiere d'oeuvre */
  svg.appendChild(S("rect",{x:640,y:YE,width:106,height:HB,rx:3,fill:V("vert"),
    opacity:"0.13"}));
  svg.appendChild(S("rect",{x:640,y:YE,width:106,height:HB,rx:3,fill:"none",
    stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("text",{x:693,y:YE+26,"text-anchor":"middle","class":"s-tit",
    fill:V("vert")},"LE LOCAL"));
  svg.appendChild(S("text",{x:693,y:YE+48,"text-anchor":"middle","class":"s-nom"},
    "à 19 °C"));
  fl(626,YE+HB/2,640,YE+HB/2,"chaud");

  /* les deux chaines se rejoignent — en equerre, dans le couloir */
  coude([[380,YI+HB],[380,152],[240,152],[240,YE]],"froid");
  svg.appendChild(S("text",{x:310,y:146,"text-anchor":"middle","class":"s-nom",
    fill:V("froid")},"ordres"));
  coude([[693,YE],[693,190],[150,190],[150,YI+HB]],"vert");
  svg.appendChild(S("text",{x:430,y:184,"text-anchor":"middle","class":"s-nom",
    fill:V("vert")},"compte rendu — ce que mesure la sonde"));

  svg.appendChild(S("text",{x:W/2,y:H-14,"text-anchor":"middle","class":"s-nom"},
    "Elles se rejoignent à l'actionneur. C'est presque toujours là que l'épreuve interroge."));
  el.appendChild(svg);
};


/* ─────────── topologies d'une ligne, et les trois longueurs ─────────── */


/* ─────────── les trois couches, quatre protocoles ─────────── */


/* ─────────── perimetrique, volumetrique, zonage ─────────── */


/* ─────────── les deux situations de CCF de l'epreuve E5 ─────────── */


/* ─────────── la monotone de puissance et la puissance souscrite ───────────
   Les points sont ceux de l'exercice du cours : au-dela de 36 kVA, seule la
   duree du depassement se paie, pas son ampleur. */


/* ─────────── trois courants, et ce qui revient par le neutre ─────────── */


/* ─────────── le batiment en ecorche ─────────── */
SCHEMAS["batiment-ecorche"]=function(el){
  var W=900,H=470;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Coupe d'un bâtiment et part de chaque poste de déperdition"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  /* ou part chaque poste, et vers ou : [x1,y1,x2,y2, ancrage du texte] */
  var OU={
    "Toiture":              [450,124,450, 58,"ma"],
    "Murs":                 [654,196,762,196,"la"],
    "Fenêtres":             [236,214,146,214,"ra"],
    "Plancher":             [450,352,450,404,"ma"],
    "Pont thermique plancher":[650,344,714,392,"ma"],
    "Ponts de menuiseries": [236,262,168,324,"ma"],
    "Air neuf":             [598,132,714, 74,"la"]
  };
  var XG=236,XD=654,YH=124,YB=352,EP=16;

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var P=ETAT.postes&&ETAT.postes.length?ETAT.postes:
      [["Murs",702],["Fenêtres",473],["Toiture",437],["Plancher",277],
       ["Pont thermique plancher",445],["Ponts de menuiseries",78],["Air neuf",1002]];
    var tot=0,mx=0;
    P.forEach(function(p){tot+=p[1];if(p[1]>mx)mx=p[1];});

    /* le dehors, le dedans, le vide sanitaire */
    svg.appendChild(S("rect",{x:0,y:0,width:W,height:H,fill:V("froid"),opacity:"0.05"}));
    svg.appendChild(S("rect",{x:XG,y:YH,width:XD-XG,height:YB-YH,
      fill:V("chaud"),opacity:"0.08"}));
    svg.appendChild(S("text",{x:(XG+XD)/2,y:YH+30,"text-anchor":"middle","class":"s-pet"},
      "INTÉRIEUR 19 °C"));
    svg.appendChild(S("rect",{x:XG,y:YB+EP,width:XD-XG,height:36,fill:V("trait"),
      opacity:"0.14"}));
    svg.appendChild(S("text",{x:(XG+XD)/2,y:YB+EP+23,"text-anchor":"middle","class":"s-pet"},
      "VIDE SANITAIRE 8 °C"));
    svg.appendChild(S("text",{x:22,y:34,"class":"s-pet"},"EXTÉRIEUR −7 °C"));

    /* l'enveloppe, en coupe */
    function paroi(x,y,l,h){
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,fill:V("encre2"),opacity:"0.30"}));
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,fill:"none",stroke:V("encre2"),
        "stroke-width":"1.5"}));
    }
    paroi(XG-EP,YH-EP,XD-XG+2*EP,EP);        /* toiture */
    paroi(XG-EP,YB,XD-XG+2*EP,EP);           /* plancher */
    paroi(XG-EP,YH,EP,YB-YH);                /* mur gauche */
    paroi(XD,YH,EP,YB-YH);                   /* mur droit */
    /* la fenetre interrompt le mur gauche */
    svg.appendChild(S("rect",{x:XG-EP,y:190,width:EP,height:52,fill:V("froid"),
      opacity:"0.45"}));
    svg.appendChild(S("rect",{x:XG-EP,y:190,width:EP,height:52,fill:"none",
      stroke:V("froid"),"stroke-width":"1.5"}));
    /* la bouche d'air neuf traverse le mur droit */
    svg.appendChild(S("rect",{x:XD,y:140,width:EP,height:22,fill:V("carte")}));
    svg.appendChild(S("rect",{x:XD,y:140,width:EP,height:22,fill:"none",
      stroke:V("encre2"),"stroke-width":"1.5"}));

    /* une fleche par poste, epaisseur proportionnelle a sa part */
    P.slice().sort(function(a,b){return a[1]-b[1];}).forEach(function(p){
      var o=OU[p[0]];if(!o)return;
      var part=tot>0?p[1]/tot:0, ep=3+13*(p[1]/(mx||1));
      var a=Math.atan2(o[3]-o[1],o[2]-o[0]);
      var fort=(p[1]===mx);
      svg.appendChild(S("line",{x1:o[0],y1:o[1],x2:o[2]-11*Math.cos(a),
        y2:o[3]-11*Math.sin(a),stroke:V("chaud"),"stroke-width":ep,
        "stroke-linecap":"round",opacity:fort?"1":"0.55"}));
      svg.appendChild(S("path",{d:"M"+o[2]+","+o[3]+
        "L"+(o[2]-15*Math.cos(a-0.42))+","+(o[3]-15*Math.sin(a-0.42))+
        "L"+(o[2]-15*Math.cos(a+0.42))+","+(o[3]-15*Math.sin(a+0.42))+"Z",
        fill:V("chaud"),opacity:fort?"1":"0.55"}));
      var anc=o[4]==="la"?"start":o[4]==="ra"?"end":"middle";
      var dx=o[4]==="la"?13:o[4]==="ra"?-13:0;
      var dy=o[4]!=="ma"?-4:(o[3]<o[1]?-24:22);
      svg.appendChild(S("text",{x:o[2]+dx,y:o[3]+dy,"text-anchor":anc,
        "class":fort?"s-lab":"s-nom"},p[0]));
      svg.appendChild(S("text",{x:o[2]+dx,y:o[3]+dy+16,"text-anchor":anc,
        "class":"s-pet"},fr(p[1],0)+" W · "+fr(100*part,0)+" %"));
    });

    var tri=P.slice().sort(function(a,b){return b[1]-a[1];});
    lg.innerHTML="Le poste le plus lourd est <b>"+tri[0][0].toLowerCase()+"</b> ("+
      fr(100*tri[0][1]/tot,0)+" %). Avec <b>"+tri[1][0].toLowerCase()+"</b>, les deux "+
      "premiers pèsent <b>"+fr(100*(tri[0][1]+tri[1][1])/tot,0)+" %</b> du total — "+
      "c'est ce classement, et non le total, qui dit où mettre l'argent.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};


/* ─────────── le diagramme de l'air humide ─────────── */
SCHEMAS["air-humide"]=function(el){
  var W=720,H=416,X0=64,X1=650,Y0=28,Y1=326;
  var TMIN=-5,TMAX=45,RMAX=25;
  var P={t:20,hr:50,evo:false};

  var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:18px;align-items:center;"+
    "margin-bottom:12px"});
  [["t","Température sèche",-5,45,0.5,"°C"],
   ["hr","Humidité relative",5,100,1,"%"]].forEach(function(f){
    var w=E("div",{style:"flex:1 1 220px"});
    var l=E("div",{style:"display:flex;justify-content:space-between;font-size:14.5px"});
    l.appendChild(E("span",{},f[1]));
    var v=E("span",{"class":"mono",style:"font-weight:600"},"");
    l.appendChild(v);w.appendChild(l);
    var i=E("input",{type:"range",min:f[2],max:f[3],step:f[4],value:P[f[0]],
      style:"width:100%;accent-color:var(--froid)"});
    i.addEventListener("input",function(){P[f[0]]=parseFloat(this.value);dessine();});
    w.appendChild(i);barre.appendChild(w);
    f.maj=function(){v.textContent=frs(P[f[0]],f[0]==="hr"?0:1)+" "+f[5];};
    P["maj_"+f[0]]=f.maj;
  });
  var bt=E("button",{"class":"bt",type:"button"},"Les quatre évolutions");
  bt.addEventListener("click",function(){
    P.evo=!P.evo;this.className="bt"+(P.evo?" p":"");dessine();});
  barre.appendChild(bt);
  el.appendChild(barre);

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Diagramme de l'air humide"});
  el.appendChild(svg);
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  el.appendChild(lect);

  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(r){return Y1-Math.min(r,RMAX)/RMAX*(Y1-Y0);}

  function dessine(){
    P.maj_t();P.maj_hr();
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var t,r;
    /* la grille */
    for(t=TMIN;t<=TMAX;t+=5){
      svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:px(t),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
        String(t)));
    }
    for(r=0;r<=RMAX;r+=5){
      svg.appendChild(S("line",{x1:X0,y1:py(r),x2:X1,y2:py(r),stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:X0-9,y:py(r)+4,"text-anchor":"end","class":"s-pet"},
        String(r)));
    }
    svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+62,"text-anchor":"middle","class":"s-pet"},
      "température sèche θ  (°C)"));
    var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
      transform:"translate(18,"+((Y0+Y1)/2)+") rotate(-90)"});
    lab.textContent="humidité absolue r  (g/kg)";
    svg.appendChild(lab);

    /* les courbes d'humidite relative, puis la saturation */
    function courbe(hr,coul,ep,tir){
      var d="",k=0,tf=TMIN;
      for(t=TMIN;t<=TMAX;t+=0.5){
        var rr=rDe(t,hr);if(rr>RMAX)break;
        d+=(k++?"L":"M")+px(t).toFixed(1)+","+py(rr).toFixed(1);tf=t;
      }
      if(k<2)return null;
      var a={d:d,fill:"none",stroke:V(coul),"stroke-width":ep};
      if(tir)a["stroke-dasharray"]="3 4";
      svg.appendChild(S("path",a));
      return tf;
    }
    [20,40,60,80].forEach(function(hr){
      var tf=courbe(hr,"trait",1,true);
      if(tf!==null)svg.appendChild(S("text",{x:px(tf)-4,y:py(rDe(tf,hr))-6,
        "text-anchor":"end","class":"s-pet",fill:V("trait")},hr+" %"));
    });
    var ts=courbe(100,"froid",2.5,false);
    if(ts!==null)svg.appendChild(S("text",{x:px(ts)-4,y:py(rDe(ts,100))-8,
      "text-anchor":"end","class":"s-pet",fill:V("froid")},"saturation φ = 100 %"));

    /* le point, et la construction du point de rosee */
    var rp=rDe(P.t,P.hr), tr=rosee(P.t,P.hr);
    var xp=px(P.t), yp=py(rp);
    svg.appendChild(S("line",{x1:xp,y1:yp,x2:xp,y2:Y1,stroke:V("encre2"),
      "stroke-width":"1","stroke-dasharray":"4 4"}));
    svg.appendChild(S("line",{x1:X0,y1:yp,x2:xp,y2:yp,stroke:V("encre2"),
      "stroke-width":"1","stroke-dasharray":"4 4"}));
    if(tr>=TMIN){
      svg.appendChild(S("line",{x1:px(tr),y1:yp,x2:px(tr),y2:Y1,stroke:V("eau"),
        "stroke-width":"2","stroke-dasharray":"5 4"}));
      svg.appendChild(S("circle",{cx:px(tr),cy:yp,r:"5",fill:V("eau")}));
      svg.appendChild(S("text",{x:px(tr),y:Y1+36,"text-anchor":"middle","class":"s-lab",
        fill:V("eau")},frs(tr,1)+" °C"));
      svg.appendChild(S("text",{x:px(tr)-8,y:yp-10,"text-anchor":"end","class":"s-nom",
        fill:V("eau")},"point de rosée"));
    }

    /* les quatre evolutions elementaires */
    if(P.evo){
      function fle(t2,r2,coul,nom,dy,cote){
        var x2=px(t2),y2=py(r2);
        var a=Math.atan2(y2-yp,x2-xp);
        svg.appendChild(S("line",{x1:xp,y1:yp,x2:x2-8*Math.cos(a),y2:y2-8*Math.sin(a),
          stroke:V(coul),"stroke-width":"2.5"}));
        svg.appendChild(S("path",{d:"M"+x2+","+y2+
          "L"+(x2-10*Math.cos(a-0.4))+","+(y2-10*Math.sin(a-0.4))+
          "L"+(x2-10*Math.cos(a+0.4))+","+(y2-10*Math.sin(a+0.4))+"Z",fill:V(coul)}));
        svg.appendChild(S("text",{x:x2+(cote?11:0),y:y2+(cote?4:dy),
          "text-anchor":cote?"start":"middle","class":"s-nom",fill:V(coul)},nom));
      }
      fle(Math.min(P.t+9,TMAX-1),rp,"chaud","chauffage sec",-10);
      fle(Math.max(P.t-8,tr,TMIN+1),rp,"froid","refroidissement",20);
      var rv=Math.min(rp+4.5,rDe(P.t,100));
      fle(P.t,rv,"eau","vapeur",0,true);
      var ra=rp+4.5, ta=tDeH(enth(P.t,rp),ra);
      fle(ta,ra,"vert","adiabatique",-10);
    }

    svg.appendChild(S("circle",{cx:xp,cy:yp,r:"7",fill:V("encre")}));
    svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
      stroke:V("trait"),"stroke-width":"1.5"}));

    /* la lecture, en clair */
    var h=enth(P.t,rp), tw=bulbeH(P.t,rp);
    lect.innerHTML="<div class='gros'>"+
      "<span><b>Humidité absolue</b><span>"+frs(rp,2)+" g/kg</span></span>"+
      "<span><b>Point de rosée</b><span>"+frs(tr,1)+" °C</span></span>"+
      "<span><b>Bulbe humide</b><span>"+frs(tw,1)+" °C</span></span>"+
      "<span><b>Enthalpie</b><span>"+frs(h,1)+" kJ/kg</span></span>"+
      "<span><b>Volume spéc.</b><span>"+frs(volSpec(P.t,rp),3)+" m³/kg</span></span>"+
      "</div><p>Une paroi dont la surface intérieure descend sous <b>"+frs(tr,1)+
      " °C</b> se couvre de buée. C'est la seule chose que le point de rosée dit — "+
      "et c'est celle que l'épreuve demande.</p>";
  }
  dessine();
};


/* --------- dispersion : deux series de meme moyenne ---------
   Ajoute le 3 septembre 2026 pour la sequence 1 de maths-PC. Aucun schema du
   kit ne montrait une dispersion, et c'est tout le propos de la sequence :
   deux installations de meme moyenne, l'une reglee, l'autre qui oscille. */


/* ═══════════════════════════════════════════════════ OUTILS */
var OUTILS={};

/* ─────────── 1. convertisseur d'unités ─────────── */
OUTILS.unites={
  titre:"Convertisseur d'unités",
  intro:"Les quatre familles du rituel. Entrez une valeur : les équivalences suivent.",
  monte:function(d){
    var FAM=[
      {n:"Débit",u:[["m³/h",1],["L/h",1000],["L/s",1/3.6],["m³/s",1/3600]],v:2},
      {n:"Puissance",u:[["W",1],["kW",0.001],["MW",1e-6]],v:1500},
      {n:"Énergie",u:[["kWh",1],["Wh",1000],["MJ",3.6],["kJ",3600]],v:1},
      {n:"Pression",u:[["bar",1],["Pa",100000],["kPa",100],["mCE",10.2]],v:1.5}
    ];
    FAM.forEach(function(f,i){
      var bloc=E("div",{style:"margin-bottom:14px"});
      bloc.appendChild(E("div",{"class":"chapeau",
        style:"font-family:'Bricolage Grotesque',sans-serif;font-size:11px;font-weight:700;"+
              "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);margin-bottom:6px"},f.n));
      var ligne=E("div",{style:"display:flex;flex-wrap:wrap;gap:8px;align-items:center"});
      var champs=[];
      f.u.forEach(function(u,j){
        var w=E("label",{style:"display:flex;align-items:center;gap:5px;font-size:14px"});
        var inp=E("input",{type:"number",step:"any",value:frs(f.v*u[1],3)});
        inp.style.width="92px";
        inp.addEventListener("input",function(){
          var v=parseFloat(this.value.replace(",","."));
          if(!isFinite(v))return;
          var base=v/u[1];
          champs.forEach(function(c,k){
            if(k!==j)c.value=frs(base*f.u[k][1],3);});
        });
        champs.push(inp);
        w.appendChild(inp);w.appendChild(E("span",{"class":"mono",
          style:"color:var(--encre2);font-size:13px"},u[0]));
        ligne.appendChild(w);
      });
      bloc.appendChild(ligne);
      d.appendChild(bloc);
    });
    d.appendChild(E("p",{style:"font-size:14.5px;color:var(--encre2);margin:4px 0 0"},
      "Rappel qui ne se convertit pas : un <b>écart</b> en degrés Celsius vaut le même "+
      "écart en kelvins. De 70 à 50 °C, c'est 20 °C et c'est 20 K."));
  }
};

/* ─────────── le diviseur de tension et la resistance de LED ───────────
   Premier outil ecrit pour une classe de bac pro CIEL. Il ne remplace aucun
   calcul : il permet d'en essayer dix en dix secondes, ce qu'une feuille ne
   permet pas — et de VOIR que la tension se partage proportionnellement aux
   resistances, au lieu de le lire. */


/* ─────────── 2. puissance transportée ─────────── */
OUTILS.reseau={
  titre:"Ce qu'un réseau transporte",
  intro:"P = Q × 1 163 × ΔT pour l'eau, P = Q × 0,34 × ΔT pour l'air. "+
        "Les deux constantes sont ρ·Cp/3600 : le même calcul, deux fluides.",
  monte:function(d){
    var g=E("div",{"class":"g2"});
    var col1=E("div"),col2=E("div");
    var st={mode:"P",Q:2,dt:20,P:20};
    function champ(par,id,lab,min,max,pas,dec,unite,cle){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");
      c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:st[cle]});
      i.addEventListener("input",function(){st[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      return function(){v.textContent=frs(st[cle],dec)+" "+unite;};
    }
    var seg=E("div",{style:"display:flex;gap:0;margin-bottom:12px"});
    ["P","Q"].forEach(function(m){
      var b=E("button",{"class":"bt"+(m===st.mode?" p":""),type:"button"},
        m==="P"?"Je cherche la puissance":"Je cherche le débit");
      b.style.borderRadius=m==="P"?"4px 0 0 4px":"0 4px 4px 0";
      b.addEventListener("click",function(){
        st.mode=m;
        [].forEach.call(seg.children,function(o,k){
          o.className="bt"+((k===0?"P":"Q")===m?" p":"");});
        maj();calc();});
      seg.appendChild(b);
    });
    col1.appendChild(seg);
    var mQ=champ(col1,"q","Débit d'eau",0.1,20,0.1,1,"m³/h","Q");
    var mP=champ(col1,"p","Puissance à transporter",1,200,1,0,"kW","P");
    var mT=champ(col1,"t","Écart départ / retour",2,40,1,0,"K","dt");
    var res=E("div",{"class":"res"});col2.appendChild(res);
    var note=E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},"");
    col2.appendChild(note);
    function maj(){
      col1.children[1].style.display=st.mode==="P"?"":"none";
      col1.children[2].style.display=st.mode==="Q"?"":"none";
    }
    function calc(){
      mQ();mP();mT();
      var h="";
      if(st.mode==="P"){
        var pe=st.Q*1163*st.dt/1000, pa=st.Q*0.34*st.dt/1000;
        h="<div class='gros'><span><b>Avec de l'eau</b><span>"+frs(pe,1)+" kW</span></span>"+
          "<span><b>Avec de l'air</b><span>"+frs(pa,2)+" kW</span></span></div>";
        note.innerHTML="Le même débit de "+frs(st.Q,1)+" m³/h transporte <b>"+
          fr(pe/pa,0)+" fois</b> plus de puissance en eau qu'en air.";
      }else{
        var qe=st.P*1000/(1163*st.dt), qa=st.P*1000/(0.34*st.dt);
        h="<div class='gros'><span><b>Débit d'eau</b><span>"+frs(qe,2)+" m³/h</span></span>"+
          "<span><b>Débit d'air</b><span>"+fr(qa,0)+" m³/h</span></span></div>";
        note.innerHTML="Pour "+frs(st.P,0)+" kW sous "+frs(st.dt,0)+" K : <b>"+
          fr(qe*1000,0)+" litres d'eau</b> par heure, ou <b>"+fr(qa,0)+" m³ d'air</b>. "+
          "C'est pour ça qu'on chauffe à l'eau et qu'on ventile à l'air.";
      }
      res.innerHTML=h;
    }
    g.appendChild(col1);g.appendChild(col2);d.appendChild(g);
    maj();calc();
  }
};

/* ─────────── 3. composeur de paroi ─────────── */
var MAT=[
 ["Enduit ciment",1.15],["Enduit plâtre",0.25],["Plaque de plâtre BA13",0.25],
 ["Béton",1.65],["Béton armé",2.50],["Parpaing creux",1.05],["Brique creuse",0.45],
 ["Brique pleine",0.85],["Pierre calcaire",1.40],["Bois massif",0.15],
 ["Laine minérale",0.038],["Laine de bois",0.040],["Ouate de cellulose",0.039],
 ["Polystyrène expansé",0.035],["Polystyrène extrudé",0.030],["Polyuréthane",0.025],
 ["Verre",1.00],["Acier",50],["Lame d'air non ventilée",null]
];
OUTILS.paroi={
  titre:"Composeur de paroi",
  intro:"Empilez les couches de l'intérieur vers l'extérieur, comme sur votre relevé — "+
        "la première ligne est celle qu'on touche depuis la pièce. Au départ, un mur "+
        "courant en isolation par l'intérieur ; ce n'est pas celui de l'activité.",
  monte:function(d){
    /* interieur -> exterieur : BA13, isolant, parpaing, enduit */
    var C=[[2,1.3],[13,10],[5,20],[0,1.5]], RSI=0.13, RSE=0.04, cible=0.25;
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var ent=E("div",{"class":"entete-c"},
      "<span>Couche</span><span>Conductivité</span><span>Épaisseur cm</span><span></span>");
    var liste=E("div");
    var ajout=E("div",{style:"display:flex;gap:8px;margin-top:11px;flex-wrap:wrap"});
    var sel=E("select",{},MAT.map(function(m,i){
      return '<option value="'+i+'">'+m[0]+(m[1]===null?"":"  λ = "+frs(m[1],m[1]<0.1?3:2))+
             '</option>';}).join(""));
    sel.value="10";
    var bt=E("button",{"class":"bt p",type:"button"},"Ajouter la couche");
    bt.addEventListener("click",function(){C.push([+sel.value,8]);dessine();calc();});
    ajout.appendChild(sel);ajout.appendChild(bt);
    var chc=E("div",{"class":"champ",style:"margin-top:13px"});
    chc.appendChild(E("label",{},"U visé par la réglementation"));
    var vc=E("span",{"class":"v"},"0,25 W/(m²·K)");chc.appendChild(vc);
    var ic=E("input",{type:"range",min:"0.10",max:"0.60",step:"0.01",value:"0.25"});
    ic.addEventListener("input",function(){cible=+this.value;
      vc.textContent=frs(cible,2)+" W/(m²·K)";calc();});
    chc.appendChild(ic);
    c1.appendChild(ent);c1.appendChild(liste);c1.appendChild(ajout);c1.appendChild(chc);
    var res=E("div",{"class":"res"}),barres=E("div",{"class":"barres"});
    c2.appendChild(res);c2.appendChild(barres);
    c2.appendChild(E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},
      "Chaque barre est la part de la couche dans la résistance totale. Dans une paroi "+
      "isolée, une seule couche fait presque tout le travail."));

    function rLame(e){return e<0.7?0.11:e<1.8?0.15:0.18;}
    function rC(c){var m=MAT[c[0]];return m[1]===null?rLame(c[1]):(c[1]/100)/m[1];}
    function dessine(){
      liste.innerHTML=C.map(function(c,i){
        var m=MAT[c[0]];
        return '<div class="lignec"><select data-i="'+i+'">'+MAT.map(function(mm,j){
          return '<option value="'+j+'"'+(j===c[0]?" selected":"")+'>'+mm[0]+'</option>';
        }).join("")+'</select><span class="rr">λ '+
        (m[1]===null?"lame d’air":frs(m[1],m[1]<0.1?3:2))+'</span>'+
        '<input type="number" data-i="'+i+'" min="0.2" max="80" step="0.5" value="'+c[1]+'">'+
        '<button class="xx" data-i="'+i+'" aria-label="Retirer">×</button></div>';
      }).join("");
      [].forEach.call(liste.querySelectorAll("select"),function(s){
        s.addEventListener("change",function(){
          C[+this.getAttribute("data-i")][0]=+this.value;dessine();calc();});});
      [].forEach.call(liste.querySelectorAll("input"),function(s){
        s.addEventListener("input",function(){
          var v=parseFloat(this.value);
          if(isFinite(v)&&v>0){C[+this.getAttribute("data-i")][1]=v;calc();}});});
      [].forEach.call(liste.querySelectorAll(".xx"),function(b){
        b.addEventListener("click",function(){
          if(C.length<=1)return;
          C.splice(+this.getAttribute("data-i"),1);dessine();calc();});});
    }
    function calc(){
      var rs=C.map(rC), rt=RSI+RSE+rs.reduce(function(a,b){return a+b;},0), u=1/rt;
      ETAT.u_mur=u;
      ETAT.couches=C.map(function(c,i){
        return {nom:MAT[c[0]][0],lam:MAT[c[0]][1],e:c[1],R:rs[i]};});
      SCHEMA_MAJ.forEach(function(f){f();});
      var manque=1/cible-rt;
      res.innerHTML="<div class='gros'><span><b>R total</b><span>"+frs(rt,2)+
        " m²·K/W</span></span><span><b>U</b><span>"+frs(u,3)+"</span></span></div>"+
        "<p>"+(u<=cible?"Cette paroi tient l'objectif de "+frs(cible,2)+"."
        :"Il manque <b>"+frs(manque,2)+" m²·K/W</b> — soit <b>"+fr(manque*0.038*100,0)+
         " cm</b> de laine minérale à ajouter.")+"</p>";
      var L=[["Superficielle intérieure",RSI,"var(--chaud)"]]
        .concat(C.map(function(c,i){
          return [MAT[c[0]][0]+" · "+frs(c[1],1)+" cm",rs[i],
            MAT[c[0]][1]!==null&&MAT[c[0]][1]<0.06?"var(--vert)":"var(--froid)"];}))
        .concat([["Superficielle extérieure",RSE,"var(--froid)"]]);
      var mx=Math.max.apply(null,L.map(function(x){return x[1];}));
      barres.innerHTML=L.map(function(x){
        return '<div class="barre"><span class="l">'+x[0]+'</span><span class="b" style="width:'+
          (100*x[1]/mx)+'%;background:'+x[2]+'"></span><span class="p">'+frs(x[1],2)+
          ' · '+fr(100*x[1]/rt,0)+' %</span></div>';}).join("");
      suivant("bilan");
    }
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    dessine();calc();
  }
};

/* ─────────── 4. bilan de déperditions ─────────── */
OUTILS.bilan={
  titre:"Bilan de déperditions",
  intro:"Un bâtiment de plain-pied. Entrez le relevé de votre local : le classement des "+
        "postes se refait à chaque changement.",
  chaine:"le U des murs vient du composeur de paroi",
  monte:function(d){
    var P={L:12,l:7,h:2.7,ti:19,te:-7,tu:8,ren:0.5,sf:14,uf:1.3,ut:0.20,up:0.30,
           psi:0.45,psim:0.10};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec).replace("-","−")+unite;});
    }
    ch(c1,"Longueur","L",4,40,0.5,1," m");
    ch(c1,"Largeur","l",3,25,0.5,1," m");
    ch(c1,"Hauteur sous plafond","h",2.2,6,0.1,1," m");
    ch(c1,"Température intérieure","ti",15,24,0.5,1," °C");
    ch(c1,"Extérieure de base","te",-15,5,0.5,1," °C");
    ch(c1,"Local sous le plancher","tu",-15,19,0.5,1," °C");
    ch(c1,"Renouvellement d'air","ren",0,2,0.05,2," vol/h");
    ch(c2,"Surface de fenêtres","sf",0,60,1,0," m²");
    ch(c2,"U des fenêtres","uf",0.7,5,0.05,2,"");
    ch(c2,"U de la toiture","ut",0.08,2.5,0.01,2,"");
    ch(c2,"U du plancher","up",0.08,2.5,0.01,2,"");
    ch(c2,"Ψ plancher / façade","psi",0,1.2,0.01,2,"");
    ch(c2,"Ψ des menuiseries (30 m)","psim",0,0.4,0.01,2,"");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:18px"});
    var barres=E("div",{"class":"barres",style:"margin-top:14px"});
    d.appendChild(res);d.appendChild(barres);
    function calc(){
      maj.forEach(function(f){f();});
      var sol=P.L*P.l, per=2*(P.L+P.l), vol=sol*P.h;
      var smur=Math.max(0,per*P.h-P.sf), dte=P.ti-P.te, dtu=P.ti-P.tu;
      var q=vol*P.ren;
      var A=[["Murs",ETAT.u_mur*smur*dte],["Fenêtres",P.uf*P.sf*dte],
             ["Toiture",P.ut*sol*dte],["Plancher",P.up*sol*dtu],
             ["Pont thermique plancher",P.psi*per*dte],
             ["Ponts de menuiseries",P.psim*30*dte],["Air neuf",0.34*q*dte]];
      var tot=A.reduce(function(a,b){return a+b[1];},0);
      ETAT.phi=tot;ETAT.surface=sol;ETAT.gv=dte>0?tot/dte:0;
      ETAT.postes=A;
      SCHEMA_MAJ.forEach(function(f){f();});
      var r=tot/sol;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Déperditions</b><span>"+fr(tot,0)+" W</span></span>"+
        "<span><b>À installer × 1,15</b><span>"+fr(tot*1.15,0)+" W</span></span>"+
        "<span><b>Ratio</b><span>"+frs(r,1)+" W/m²</span></span>"+
        "<span><b>GV</b><span>"+frs(ETAT.gv,1)+" W/K</span></span></div>"+
        "<p>Sol "+frs(sol,0)+" m², périmètre "+frs(per,0)+" m, murs "+frs(smur,0)+
        " m², air neuf "+fr(q,0)+" m³/h. "+
        (r>80?"<b>Au-delà de 80 W/m² : bâtiment ancien non isolé.</b>"
         :r>40?"Entre 40 et 80 W/m² : isolation partielle."
         :"<b>Sous 40 W/m² : niveau d'une construction récente.</b>")+"</p>";
      var s=A.slice().sort(function(a,b){return b[1]-a[1];}), mx=s[0][1]||1;
      barres.innerHTML=s.map(function(p){
        return '<div class="barre"><span class="l">'+p[0]+'</span><span class="b" style="width:'+
          (100*p[1]/mx)+'%"></span><span class="p">'+fr(p[1],0)+' W · '+
          fr(100*p[1]/tot,0)+' %</span></div>';}).join("");
      suivant("energie");
    }
    OUTILS.bilan._recalc=calc;
    calc();

  }
};

/* ─────────── 5. besoin annuel et temps de retour ─────────── */
OUTILS.energie={
  titre:"Besoin annuel et temps de retour",
  intro:"Le besoin de la saison, la facture, et ce que rapporte un scénario de travaux.",
  chaine:"le GV vient du bilan de déperditions",
  monte:function(d){
    var P={ville:0,ap:25,prix:0.25,trav:3000,gain:15};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var cv=E("div",{"class":"champ"});
    cv.appendChild(E("label",{},"Ville"));
    var vv=E("span",{"class":"v"},"");cv.appendChild(vv);
    var sv=E("select",{},VILLES.map(function(v,i){
      return '<option value="'+i+'">'+v[0]+" — "+v[1]+" DJU</option>";}).join(""));
    sv.addEventListener("change",function(){P.ville=+this.value;calc();});
    cv.appendChild(sv);c1.appendChild(cv);
    maj.push(function(){vv.textContent=VILLES[P.ville][1]+" DJU";});
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=(dec===0?fr(P[cle],0):frs(P[cle],dec))+unite;});
    }
    ch(c1,"Apports gratuits","ap",0,45,1,0," %");
    ch(c1,"Prix du kWh","prix",0.03,0.40,0.005,3," €");
    ch(c2,"Coût des travaux envisagés","trav",500,30000,100,0," €");
    ch(c2,"Gain sur les déperditions","gain",1,60,1,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var r1=E("div",{"class":"res",style:"margin-top:16px"});
    var r2=E("div",{"class":"res",style:"margin-top:11px"});
    d.appendChild(r1);d.appendChild(r2);
    function calc(){
      maj.forEach(function(f){f();});
      ETAT.ville=P.ville;
      SCHEMA_MAJ.forEach(function(f){f();});
      var dju=VILLES[P.ville][1];
      var brut=ETAT.gv*dju*24/1000, net=brut*(1-P.ap/100);
      var ratio=ETAT.surface>0?net/ETAT.surface:0, fact=net*P.prix;
      var cl=ratio<50?["A ou B","var(--vert)"]:ratio<90?["C","var(--vert)"]:
             ratio<150?["D","var(--tiede)"]:ratio<230?["E","var(--tiede)"]:
             ratio<330?["F","var(--chaud)"]:["G","var(--chaud)"];
      r1.innerHTML="<div class='gros'><span><b>Besoin net</b><span>"+fr(net,0)+
        " kWh</span></span><span><b>Ratio</b><span>"+fr(ratio,0)+
        " kWh/(m²·an)</span></span><span><b>Facture</b><span>"+fr(fact,0)+
        " €</span></span></div><p>Besoin brut "+fr(brut,0)+" kWh, dont "+P.ap+
        " % d'apports gratuits. Classe <b style='color:"+cl[1]+"'>"+cl[0]+
        "</b> — <em>en énergie utile</em>, ce qui n'est pas l'échelle du DPE.</p>";
      var eco=net*(P.gain/100)*P.prix, tr=eco>0?P.trav/eco:Infinity;
      r2.innerHTML="<div class='gros'><span><b>Économie annuelle</b><span>"+fr(eco,0)+
        " €/an</span></span><span><b>Temps de retour</b><span>"+
        (isFinite(tr)?frs(tr,1)+" ans":"—")+"</span></span></div><p>"+
        (!isFinite(tr)?"Aucune économie."
         :tr<8?"<b>Moins de huit ans</b> : un maître d'ouvrage engage sans hésiter."
         :tr<20?"Entre huit et vingt ans : la décision dépend du prix de l'énergie retenu."
         :"<b>Plus de vingt ans</b> : indéfendable sur le seul argument financier. "+
          "Il faut un autre motif — confort, obligation, valeur du bien.")+"</p>";
    }
    OUTILS.energie._recalc=calc;
    calc();
  }
};


/* ─────────── lire une unite ─────────── */
var UNITES=[
 {k:"W",u:"W",n:"Le watt — une puissance",
  lit:"watt",
  m:"Ce que la machine fait <b>à chaque instant</b>. Elle ne s'accumule pas : "+
    "à l'arrêt, elle vaut zéro.",
  f:"Un radiateur <b>appelle</b> 1 500 W. Il ne « consomme » pas 1 500 W.",
  o:"radiateur 1 à 2 kW · chaudière de maison 20 à 25 kW"},
 {k:"kWh",u:"kWh",n:"Le kilowattheure — une énergie",
  lit:"kilowatt-heure",
  m:"Une puissance <b>multipliée par une durée</b>. C'est ce qui est facturé.",
  f:"L'unité contient sa formule : kW × h, donc <b>E = P × t</b>.",
  o:"1 kWh = 3 600 kJ · un radiateur de 1 kW pendant 1 h"},
 {k:"K",u:"K",n:"Le kelvin — un écart de température",
  lit:"kelvin",
  m:"Un <b>écart</b>, jamais une température absolue dans nos formules.",
  f:"Un écart de 20 °C vaut 20 K. <b>On n'ajoute pas 273.</b>",
  o:"régime 70/50 → 20 K · plancher chauffant 45/35 → 10 K"},
 {k:"m3h",u:"m³/h",n:"Le mètre cube par heure — un débit",
  lit:"mètre cube par heure",
  m:"Un <b>volume par unité de temps</b>. Le « par heure » est ce qui piège : "+
    "les fiches constructeur donnent souvent des L/s.",
  f:"1 L/s = 3,6 m³/h. 1 m³/h = 1 000 L/h.",
  o:"air neuf 25 à 30 m³/h par personne · réseau d'immeuble 2 m³/h"},
 {k:"lambda",u:"W/(m·K)",p:"W/(m·K)  λ",n:"λ — la conductivité du matériau",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui traverse <b>un mètre d'épaisseur</b> du matériau, par kelvin d'écart. "+
    "Propriété du matériau seul.",
  f:"On la <b>divise</b> par une longueur, on ne la multiplie pas : <b>R = e / λ</b>.",
  o:"isolant < 0,05 · béton 1,65 · acier 50"},
 {k:"R",u:"m²·K/W",n:"R — la résistance thermique",
  lit:"mètres carrés-kelvin par watt",
  m:"L'inverse d'un flux : combien de <b>kelvins d'écart</b> il faut pour faire "+
    "passer un watt par mètre carré.",
  f:"C'est l'unité de U retournée. <b>U = 1 / R</b>.",
  o:"10 cm de laine 2,6 · Rsi 0,13 · Rse 0,04"},
 {k:"U",u:"W/(m²·K)",n:"U — le coefficient de transmission",
  lit:"watts par mètre carré et par kelvin",
  m:"Ce qui traverse <b>un mètre carré de paroi complète</b> pour un kelvin d'écart. "+
    "Il englobe déjà la conduction, la convection et le rayonnement.",
  f:"Il manque des m² et des K : <b>Φ = U × S × ΔT</b>.",
  o:"mur neuf 0,20 · double vitrage 1,4 · mur non isolé 2,5"},
 {k:"psi",u:"W/(m·K)",p:"W/(m·K)  Ψ",n:"Ψ — le coefficient linéique d'un pont thermique",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui fuit par <b>un mètre de liaison</b>, par kelvin d'écart. Une liaison "+
    "est une ligne, pas une surface.",
  f:"Il manque des <b>mètres</b> et des K : <b>Φ = Ψ × L × ΔT</b>. "+
    "<b>Même unité que λ, rôle opposé</b> : λ se divise, Ψ se multiplie.",
  o:"ITE 0,05 à 0,15 · ITI plancher traversant 0,60 à 0,90"},
 {k:"GV",u:"W/K",n:"GV — la signature du bâtiment",
  lit:"watts par kelvin",
  m:"Ce que le bâtiment perd <b>par kelvin d'écart</b>, tous postes confondus. "+
    "Il ne dépend pas de la météo.",
  f:"Il manque des K : <b>Φ = GV × ΔT</b>, donc <b>GV = Φ / ΔT</b>.",
  o:"petit bureau 130 W/K · maison rénovée 80 à 150 W/K"},
 {k:"DJU",u:"DJU",n:"Le degré-jour unifié",
  lit:"degré-jour unifié",
  m:"La somme, sur toute la saison, des <b>degrés manquants sous 18 °C</b>. "+
    "Un jour à 13 °C de moyenne apporte 5 DJU.",
  f:"Des kelvins × des jours. Avec le GV : <b>besoin = GV × DJU × 24 / 1 000</b>.",
  o:"Nice 1 100 · Paris 2 300 · Strasbourg 2 700"},
 {k:"ratio",u:"kWh/(m²·an)",n:"Le ratio de consommation",
  lit:"kilowattheures par mètre carré et par an",
  m:"L'énergie d'une année ramenée au <b>mètre carré chauffé</b>. C'est ce qui "+
    "permet de comparer deux bâtiments de tailles différentes.",
  f:"Précisez toujours <b>lequel</b> : utile, final ou primaire. Les trois "+
    "peuvent varier du simple au triple.",
  o:"passif 15 · EnerPHit 25 · bâtiment 1970 non rénové 200 et plus"}
];
OUTILS["lire-unite"]={
  titre:"Lire une unité",
  intro:"Une unité contient sa formule. Chaque « par » dit ce qu'il faut "+
        "remultiplier pour revenir à des watts. Cliquez-en une.",
  monte:function(d,el){
    var filtre=el&&el.getAttribute("data-filtre");
    var L=filtre?UNITES.filter(function(x){
      return filtre.split(",").indexOf(x.k)>=0;}):UNITES;
    var chips=E("div",{style:"display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px"});
    var carte=E("div",{"class":"res"});
    d.appendChild(chips);d.appendChild(carte);
    function montre(i){
      [].forEach.call(chips.children,function(b,k){
        b.className="bt"+(k===i?" p":"");});
      var x=L[i];
      carte.innerHTML=
        "<div style='font-family:\"IBM Plex Mono\",monospace;font-size:23px;"+
        "font-weight:600;margin-bottom:2px'>"+x.u+"</div>"+
        "<div class='gro' style='font-weight:600;font-size:16.5px;margin-bottom:10px'>"+
        x.n+"</div>"+
        "<p><b>Se lit</b> « "+x.lit+" »</p>"+
        "<p><b>Mesure</b> "+x.m+"</p>"+
        "<p><b>La formule qu'elle contient</b> "+x.f+"</p>"+
        "<p><b>Ordres de grandeur</b> "+x.o+"</p>";
      [].forEach.call(carte.querySelectorAll("p b:first-child"),function(b){
        b.style.cssText="font-family:'Bricolage Grotesque',sans-serif;font-size:10.5px;"+
          "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
          "display:block;margin-bottom:1px";
      });
    }
    L.forEach(function(x,i){
      var b=E("button",{"class":"bt",type:"button"},x.p||x.u);
      b.style.fontFamily='"IBM Plex Mono",monospace';
      b.addEventListener("click",function(){montre(i);});
      chips.appendChild(b);
    });
    montre(0);
  }
};


/* ═══════════════════════════════════════════════════ HYDRAULIQUE
   Eau a 60 degres : masse volumique 983 kg/m3, viscosite 0,474e-6 m2/s.
   Blasius vaut pour un tube lisse — cuivre, PER, multicouche — et pour un
   Reynolds compris entre 4 000 et 100 000, ce qui couvre tout le chauffage. */
var RHO_EAU=983, NU_EAU=0.474e-6;
var TUBES=[["14 × 1",12],["16 × 1",14],["18 × 1",16],["20 × 1",18],
           ["22 × 1",20],["26 × 1",24],["28 × 1,5",25]];
function debit(pkW,dt){return pkW*1000/(1163*dt);}          /* m3/h */
function vitesse(Q,dmm){                                     /* m/s */
  var S=Math.PI*Math.pow(dmm/1000,2)/4;
  return (Q/3600)/S;
}
function lineique(Q,dmm){                                    /* Pa/m */
  var d=dmm/1000, v=vitesse(Q,dmm);
  if(v<=0)return 0;
  var Re=v*d/NU_EAU;
  var lam=Re<2000?64/Math.max(Re,1):0.3164/Math.pow(Re,0.25);
  return lam*RHO_EAU*v*v/(2*d);
}
var SINGU=[["Coude à 90°",0.065],["Té de passage",0.035],["Vanne d'arrêt",0.020],
           ["Robinet thermostatique",0.250],["Radiateur",0.125]];
/* longueur equivalente = coefficient x diametre interieur en mm, formule
   d'atelier qui redonne les valeurs du tableau de la seance 8 */

/* ─────────── 1. pertes de charge ─────────── */
OUTILS.pertes={
  titre:"Pertes de charge d'un circuit",
  intro:"Le débit vient de la puissance, la vitesse du diamètre, la perte "+
        "linéique du frottement. Les singularités se convertissent en mètres "+
        "de tube droit.",
  monte:function(d){
    var P={p:12,dt:20,tube:4,L:24,n:[6,4,2,4,4]};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec)+unite;});
    }
    ch(c1,"Puissance des émetteurs","p",1,40,0.5,1," kW");
    ch(c1,"Écart départ / retour","dt",5,30,1,0," K");
    var ct=E("div",{"class":"champ"});
    ct.appendChild(E("label",{},"Tube cuivre"));
    var vt=E("span",{"class":"v"},"");ct.appendChild(vt);
    var st=E("select",{},TUBES.map(function(x,i){
      return '<option value="'+i+'"'+(i===P.tube?" selected":"")+'>'+x[0]+
             " — intérieur "+x[1]+" mm</option>";}).join(""));
    st.addEventListener("change",function(){P.tube=+this.value;calc();});
    ct.appendChild(st);c1.appendChild(ct);
    maj.push(function(){vt.textContent=TUBES[P.tube][1]+" mm";});
    ch(c1,"Longueur droite","L",2,200,1,0," m");

    c2.appendChild(E("div",{style:"font-family:'Bricolage Grotesque',sans-serif;"+
      "font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;"+
      "color:var(--encre2);margin-bottom:4px"},"Singularités du circuit"));
    SINGU.forEach(function(s,i){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},s[0]));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var inp=E("input",{type:"range",min:0,max:20,step:1,value:P.n[i]});
      inp.addEventListener("input",function(){P.n[i]=parseFloat(this.value);calc();});
      c.appendChild(inp);c2.appendChild(c);
      maj.push(function(){
        v.textContent=P.n[i]+" × "+frs(s[1]*TUBES[P.tube][1],1)+" m";});
    });
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:16px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var dmm=TUBES[P.tube][1];
      var Q=debit(P.p,P.dt), v=vitesse(Q,dmm), j=lineique(Q,dmm);
      var Leq=0;
      SINGU.forEach(function(s,i){Leq+=P.n[i]*s[1]*dmm;});
      var Lt=P.L+Leq, dp=j*Lt;
      ETAT.k_reseau=Q>0?(dp/9810)/(Q*Q):2.5;
      ETAT.q_besoin=Q;
      var okv=v<=1.0, okj=j<=200;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Débit</b><span>"+frs(Q,2)+" m³/h</span></span>"+
        "<span><b>Vitesse</b><span>"+frs(v,2)+" m/s</span></span>"+
        "<span><b>Perte linéique</b><span>"+fr(j,0)+" Pa/m</span></span>"+
        "<span><b>Longueur équivalente</b><span>"+frs(Leq,1)+" m</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Longueur totale</b><span>"+frs(Lt,1)+" m</span></span>"+
        "<span><b>Perte de charge</b><span>"+fr(dp,0)+" Pa</span></span>"+
        "<span><b>soit</b><span>"+frs(dp/9810,2)+" mCE</span></span>"+
        "</div><p>"+
        (okv&&okj?"<b>Les deux critères sont tenus</b> : vitesse sous 1 m/s, perte "+
          "linéique sous 200 Pa/m."
         :"<b>"+(!okv&&!okj?"Les deux critères sont dépassés"
           :!okv?"La vitesse dépasse 1 m/s":"La perte linéique dépasse 200 Pa/m")+
          "</b> — bruit et consommation du circulateur. Prendre le tube au-dessus.")+
        " Les singularités valent <b>"+fr(100*Leq/Lt,0)+" %</b> de la longueur "+
        "totale : ce n'est jamais un détail.</p>";
      suivant("point-fonctionnement");
    }
    calc();
    OUTILS.pertes._recalc=calc;
  }
};

/* ─────────── 2. point de fonctionnement ─────────── */
var POMPES=[["Vitesse I",2.0,1.8],["Vitesse II",3.0,2.2],["Vitesse III",4.0,2.6]];
OUTILS["point-fonctionnement"]={
  titre:"Le point de fonctionnement",
  intro:"La courbe du réseau monte comme le carré du débit. Celle du circulateur "+
        "descend. Elles se croisent en un seul point, et c'est là que "+
        "l'installation travaille — qu'on le veuille ou non.",
  chaine:"la résistance du réseau vient des pertes de charge",
  monte:function(d){
    var P={k:2.5,besoin:0.52,auto:true};
    var W=680,H=380,X0=64,X1=640,Y0=24,Y1=310,QMAX=3,HMAX=5;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Point de fonctionnement d'un circulateur"});
    var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:18px;align-items:center;"+
      "margin-bottom:10px"});
    var maj=[];
    function ch(lab,cle,min,max,pas,dec,unite){
      var w=E("div",{style:"flex:1 1 230px"});
      var l=E("div",{style:"display:flex;justify-content:space-between;font-size:14.5px"});
      l.appendChild(E("span",{},lab));
      var v=E("span",{"class":"mono",style:"font-weight:600"},"");
      l.appendChild(v);w.appendChild(l);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle],
        style:"width:100%"});
      i.addEventListener("input",function(){
        P[cle]=parseFloat(this.value);if(cle==="k")P.auto=false;dessine();});
      w.appendChild(i);barre.appendChild(w);
      maj.push(function(){v.textContent=frs(P[cle],dec)+unite;});
    }
    ch("Résistance du réseau k","k",0.3,12,0.1,1,"");
    ch("Débit nécessaire","besoin",0.1,2,0.01,2," m³/h");
    d.appendChild(barre);d.appendChild(svg);
    var lect=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(lect);

    function px(q){return X0+q/QMAX*(X1-X0);}
    function py(h){return Y1-h/HMAX*(Y1-Y0);}

    function dessine(){
      if(P.auto&&ETAT.k_reseau)P.k=Math.max(0.3,Math.min(12,ETAT.k_reseau));
      if(ETAT.q_besoin)P.besoin=Math.max(0.1,Math.min(2,ETAT.q_besoin));
      maj.forEach(function(f){f();});
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var q,i;
      for(q=0;q<=QMAX;q+=0.5){
        svg.appendChild(S("line",{x1:px(q),y1:Y0,x2:px(q),y2:Y1,stroke:V("trait2"),
          "stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(q),y:Y1+18,"text-anchor":"middle",
          "class":"s-pet"},frs(q,1)));
      }
      for(i=0;i<=HMAX;i++){
        svg.appendChild(S("line",{x1:X0,y1:py(i),x2:X1,y2:py(i),stroke:V("trait2"),
          "stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-9,y:py(i)+4,"text-anchor":"end","class":"s-pet"},
          String(i)));
      }
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+40,"text-anchor":"middle",
        "class":"s-pet"},"débit Q  (m³/h)"));
      var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
        transform:"translate(18,"+((Y0+Y1)/2)+") rotate(-90)"});
      lab.textContent="hauteur manométrique  (mCE)";
      svg.appendChild(lab);

      /* les trois courbes de circulateur */
      var inter=[];
      POMPES.forEach(function(p,i2){
        var H0=p[1], qm=p[2], a=H0/(qm*qm), dd="",k2=0;
        for(q=0;q<=qm;q+=0.02){
          var h=H0-a*q*q;if(h<0)break;
          dd+=(k2++?"L":"M")+px(q).toFixed(1)+","+py(h).toFixed(1);
        }
        svg.appendChild(S("path",{d:dd,fill:"none",stroke:V("froid"),
          "stroke-width":"2","opacity":String(0.45+0.25*i2)}));
        var qi=Math.sqrt(H0/(P.k+a)), hi=P.k*qi*qi;
        inter.push([p[0],qi,hi]);
        svg.appendChild(S("text",{x:px(0)+9,y:py(H0)-7,"text-anchor":"start",
          "class":"s-pet",fill:V("froid")},p[0]));
      });

      /* la courbe du reseau */
      var dr="",k3=0;
      for(q=0;q<=QMAX;q+=0.02){
        var h2=P.k*q*q;if(h2>HMAX)break;
        dr+=(k3++?"L":"M")+px(q).toFixed(1)+","+py(h2).toFixed(1);
      }
      svg.appendChild(S("path",{d:dr,fill:"none",stroke:V("chaud"),"stroke-width":"3"}));
      svg.appendChild(S("text",{x:px(Math.sqrt(HMAX/P.k))+8,y:Y0+16,
        "class":"s-nom",fill:V("chaud")},"réseau  Δp = k Q²"));

      /* les trois points de fonctionnement */
      inter.forEach(function(x){
        svg.appendChild(S("circle",{cx:px(x[1]),cy:py(x[2]),r:"6",fill:V("encre")}));
      });

      /* le debit necessaire */
      svg.appendChild(S("line",{x1:px(P.besoin),y1:Y0,x2:px(P.besoin),y2:Y1,
        stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"6 4"}));
      svg.appendChild(S("text",{x:px(P.besoin)+8,y:Y1-8,"class":"s-nom",fill:V("vert")},
        "débit nécessaire"));
      svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
        stroke:V("trait"),"stroke-width":"1.5"}));

      var mieux=null;
      inter.forEach(function(x){if(!mieux||Math.abs(x[1]-P.besoin)<Math.abs(mieux[1]-P.besoin))mieux=x;});
      lect.innerHTML="<div class='gros'>"+inter.map(function(x){
        return "<span><b>"+x[0]+"</b><span>"+frs(x[1],2)+" m³/h</span></span>";
      }).join("")+"</div><p>Le débit nécessaire est de <b>"+frs(P.besoin,2)+
        " m³/h</b>. La vitesse la plus proche est <b>"+mieux[0].replace("Vitesse","vitesse")+
        "</b>, qui en donne "+frs(mieux[1],2)+
        (mieux[1]>P.besoin*1.15
         ? " — soit <b>"+fr(100*(mieux[1]/P.besoin-1),0)+" % de trop</b>. "+
           "Trop de débit, c'est du bruit, un ΔT écrasé et un circulateur qui "+
           "consomme pour rien : il faut brider au robinet ou changer de pompe."
         : ". L'écart reste acceptable.")+"</p>";
    }
    dessine();
    OUTILS["point-fonctionnement"]._recalc=dessine;
  }
};

/* ─────────── 3. eau chaude sanitaire ─────────── */
/* litres puises par heure, internat de 40 eleves — total 1 632 L par jour */
var PROFIL=[0,0,0,0,0,32,128,224,160,64,32,32,48,32,32,32,48,96,192,256,128,64,32,0];


/* Saturation du R134a, valeurs arrondies : T, p bar, h liquide, h vapeur */
var SAT134=[[-30,0.84,160,380],[-20,1.33,173,386],[-10,2.01,186,392],[0,2.93,200,399],
  [10,4.15,213,404],[20,5.72,227,409],[30,7.70,241,414],[40,10.17,256,419],
  [50,13.18,271,423],[60,16.82,287,426],[70,21.17,304,428]];
function sat134(t){
  var i=0;while(i<SAT134.length-2&&SAT134[i+1][0]<t)i++;
  var a=SAT134[i],b=SAT134[i+1],f=(t-a[0])/(b[0]-a[0]);
  return {p:Math.exp(Math.log(a[1])+f*(Math.log(b[1])-Math.log(a[1]))),
          hl:a[2]+f*(b[2]-a[2]), hv:a[3]+f*(b[3]-a[3])};
}












/* ─── la sous-station a ballon primaire : les cinq reseaux ─── */
var SS_RESEAUX=[
  {k:"urbain",   c:"chaud",  n:"Réseau de chauffage urbain",
   d:"Le primaire. Il appartient au fournisseur : c'est son compteur qui facture."},
  {k:"chauffage",c:"tiede",  n:"Chauffage du bâtiment",
   d:"Départ régulé par V21 en loi d'eau, circulateur à vitesse variable."},
  {k:"charge",   c:"vert",   n:"Charge du ballon primaire",
   d:"P22 remplit la réserve d'énergie par le haut ; le bas repart vers l'échangeur."},
  {k:"primecs",  c:"violet", n:"Primaire de production ECS",
   d:"P23 puise en haut du ballon ; V22 dose pour tenir la température distribuée."},
  {k:"sanitaire",c:"froid",  n:"Réseaux sanitaires",
   d:"Eau froide et bouclage entrent, l'eau chaude sanitaire sort. Aucun stockage."}
];



/* ─────────── sous-station : puissance souscrite et abonnement ─────────── */


/* ─── pompe a chaleur : ce qui entre, ce qui sort, a l'echelle ─── */


/* ─── batterie froide : l'ADP et le facteur de bipasse ─── */


/* ─── les barres du calibrage U41 : une mesure, une teinte, un accent ─── */
function barres(el,opt){
  /* opt : {titre, source, lignes:[{n, v, unite, detail, accent}], max} */
  var W=880, HL=46, H=64+opt.lignes.length*HL+40;
  var X0=300, X1=770;                       /* la zone tracee */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":opt.titre});
  svg.appendChild(S("text",{x:24,y:26,"class":"s-tit"},opt.titre.toUpperCase()));
  var mx=opt.max||Math.max.apply(null,opt.lignes.map(function(l){return l.v;}));
  var carte=E("p",{"class":"leg-schema"},opt.source||"");
  var barres=[];

  opt.lignes.forEach(function(l,i){
    var y=64+i*HL, h=24;
    var w=Math.max(3,(X1-X0)*l.v/mx);
    /* le libelle, en encre — jamais dans la couleur de la barre */
    svg.appendChild(S("text",{x:X0-14,y:y+17,"text-anchor":"end","class":"s-nom"},l.n));
    var r=S("rect",{x:X0,y:y,width:w,height:h,rx:4,
      fill:V(l.accent?"chaud":"froid"),opacity:l.accent?"0.9":"0.62"});
    svg.appendChild(r);
    /* etiquette directe : la valeur au bout de la barre, le detail en retrait.
       Un seul <text> avec deux <tspan> : le decalage est mesure par le moteur
       de rendu, jamais estime au nombre de caracteres. */
    var et=S("text",{x:X0+w+12,y:y+17,"class":"s-lab"});
    et.appendChild(S("tspan",{},l.v+(l.unite||"")));
    if(l.detail)et.appendChild(S("tspan",{dx:"10","class":"s-pet"},l.detail));
    svg.appendChild(et);
    /* zone de survol plus large que la barre */
    var z=S("rect",{x:0,y:y-8,width:W,height:h+16,fill:"transparent"});
    svg.appendChild(z);
    barres.push({r:r,l:l});
    z.addEventListener("mouseenter",function(){
      barres.forEach(function(b){b.r.setAttribute("opacity",b.r===r?"1":"0.22");});
      carte.innerHTML="<b>"+l.n+"</b> — "+(l.aide||l.detail||"");});
    z.addEventListener("mouseleave",function(){
      barres.forEach(function(b){
        b.r.setAttribute("opacity",b.l.accent?"0.9":"0.62");});
      carte.textContent=opt.source||"";});
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(carte);
}





/* ═══════════════════════════════════════════════════ SCHEMAS — CAP
   Consolidation maths. Rien de thermique ici : ce sont les six images qui
   manquaient aux fiches, et qu'aucun polycopie ne portait. Elles servent
   plusieurs fiches chacune — la barre des fractions revient en proportion,
   la droite graduee en lecture de graphique. */

/* ─────────── le tableau des rangs, et la virgule qui glisse ─────────── */


/* ─────────── poser : les virgules l'une sous l'autre ─────────── */


/* ─────────── decomposer un produit : le rectangle ─────────── */


/* ─────────── la barre des fractions ─────────── */


/* ─────────── la droite graduee : 0,75 contre 0,8 ─────────── */


/* ─────────── arrondir : trois sens, une seule regle du 5 ─────────── */


/* ─────────── priorites : les memes touches, deux resultats ─────────── */


/* ─────────── B · milli, unité, kilo ─────────── */


/* ─────────── B · l'escalier des longueurs ─────────── */


/* ─────────── B · le mètre carré, découpé pour de vrai ─────────── */


/* ─────────── B · le mètre cube et le litre ─────────── */


/* ─────────── B · l'heure, en minutes et en décimal ─────────── */


/* ─────────── B · des km/h aux m/s ─────────── */


/* ─────────── C · le tableau de proportionnalité et son coefficient ─────────── */


/* ─────────── C · forfait plus part variable ─────────── */


/* ─────────── C · une remise puis une TVA ─────────── */


/* ─────────── C · ce que pèse un mètre cube ─────────── */


/* ─────────── D · croiser une ligne et une colonne ─────────── */


/* ─────────── D · l'échelle d'un plan ─────────── */


/* ─────────── E · défaire les opérations dans l'ordre inverse ─────────── */


/* ─────────── F · les trois morceaux d'une réponse ─────────── */







/* ─── PAC : le point de bivalence, et le piege de la puissance ─── */


/* ─── echangeur : co-courant contre contre-courant, et le DTLM ─── */


/* ─── les quatre domaines du site, pour l'en-tete de l'accueil ─── */


/* ═══════════════════════════════════════════════ LA MACHINE FRIGORIFIQUE
   Six fluides, leurs tables de saturation, et quatre outils qui s'en servent.

   Les enthalpies ne sont pas tabulees : elles se calculent, avec la reference
   internationale h liquide = 200 kJ/kg a 0 °C, commune a tous les fluides pour
   que deux cycles se comparent.

     hl(t) = 200 + cpl x t
     Lv(t) = Lv0 x ((Tc - T) / (Tc - 273,15))^0,38      formule de Watson
     hv(t) = hl(t) + Lv(t)

   Verifie sur R134a contre la table du kit : ecart sous 1,5 kJ/kg de -20 a
   +40 °C. Ne pas remplacer par une interpolation lineaire de Lv, qui derive de
   10 % pres du point critique. */

var FLUIDES = {
  "R134a": {M:102, chim:"tétrafluoroéthane", gwp:1430, classe:"A1", lp:0.25,
    tc:101.1, lv0:198.6, cpl:1.34, cpv:0.90, gam:1.12, coul:"froid",
    ou:"climatisation, pompes à chaleur anciennes, transport",
    p:[[-40,0.51],[-30,0.85],[-20,1.33],[-10,2.01],[0,2.93],[10,4.15],[20,5.72],
       [30,7.70],[40,10.17],[50,13.18],[60,16.82],[70,21.17]]},
  "R410A": {M:72.6, chim:"mélange R32 + R125", gwp:2088, classe:"A1", lp:0.44,
    tc:71.4, lv0:221.4, cpl:1.52, cpv:1.05, gam:1.16, coul:"violet",
    ou:"climatisation split, le parc installé des vingt dernières années",
    p:[[-40,1.75],[-30,2.72],[-20,4.00],[-10,5.73],[0,7.98],[10,10.87],[20,14.50],
       [30,19.00],[40,24.50],[50,31.16],[60,39.10]]},
  "R32": {M:52, chim:"difluorométhane", gwp:675, classe:"A2L", lp:0.061,
    tc:78.1, lv0:315.3, cpl:1.85, cpv:1.15, gam:1.20, coul:"tiede",
    ou:"climatisation neuve : il remplace le R410A",
    p:[[-40,1.79],[-30,2.79],[-20,4.06],[-10,5.81],[0,8.13],[10,11.12],[20,14.90],
       [30,19.60],[40,25.30],[50,32.30],[60,40.60]]},
  "R290": {M:44.1, chim:"propane", gwp:3, classe:"A3", lp:0.008,
    tc:96.7, lv0:374.5, cpl:2.42, cpv:1.72, gam:1.13, coul:"vert",
    ou:"pompes à chaleur récentes, vitrines, petites charges",
    p:[[-40,1.11],[-30,1.67],[-20,2.45],[-10,3.45],[0,4.74],[10,6.37],[20,8.36],
       [30,10.79],[40,13.70],[50,17.13],[60,21.20]]},
  "R717": {M:17, chim:"ammoniac", gwp:0, classe:"B2L", lp:0.00035,
    tc:132.3, lv0:1262, cpl:4.61, cpv:2.65, gam:1.31, coul:"chaud",
    ou:"grand froid industriel, patinoires, agroalimentaire",
    p:[[-40,0.72],[-30,1.20],[-20,1.90],[-10,2.91],[0,4.29],[10,6.15],[20,8.57],
       [30,11.67],[40,15.55],[50,20.33],[60,26.10]]},
  "R744": {M:44, chim:"dioxyde de carbone", gwp:1, classe:"A1", lp:0.10,
    tc:31.0, lv0:230.9, cpl:2.42, cpv:1.30, gam:1.29, coul:"encre2",
    ou:"froid commercial, ECS en pompe à chaleur",
    p:[[-40,10.05],[-30,14.28],[-20,19.70],[-10,26.49],[0,34.85],[10,45.02],
       [20,57.29],[30,72.14]]}
};
var NOMS_FLUIDES = ["R134a","R410A","R32","R290","R717","R744"];

/* pression de saturation, interpolee en logarithme : la courbe est
   exponentielle, une interpolation lineaire y perdrait 3 % au milieu du pas */
function psatF(nom, t) {
  var T = FLUIDES[nom].p, i = 0;
  if (t <= T[0][0]) return T[0][1];
  if (t >= T[T.length-1][0]) return T[T.length-1][1];
  while (i < T.length-2 && T[i+1][0] < t) i++;
  var a = T[i], b = T[i+1], f = (t-a[0])/(b[0]-a[0]);
  return Math.exp(Math.log(a[1]) + f*(Math.log(b[1])-Math.log(a[1])));
}
function lvF(nom, t) {
  var f = FLUIDES[nom], Tc = f.tc + 273.15, T = t + 273.15;
  if (T >= Tc) return 0;
  return f.lv0 * Math.pow((Tc-T)/(Tc-273.15), 0.38);
}
function satF(nom, t) {
  var f = FLUIDES[nom], hl = 200 + f.cpl*t;
  return {p:psatF(nom,t), hl:hl, hv:hl + lvF(nom,t)};
}
/* un menu de fluides, monte partout pareil */
function choixFluide(par, etat, cle, calc, libelle) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},libelle||"Fluide frigorigène"));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var s = E("select",{}, NOMS_FLUIDES.map(function(n){
    return '<option value="'+n+'"'+(n===etat[cle]?" selected":"")+'>'+n+
           " — "+FLUIDES[n].chim+"</option>";}).join(""));
  s.addEventListener("change", function(){etat[cle]=this.value;calc();});
  c.appendChild(s);
  par.appendChild(c);
  return function(){v.textContent = FLUIDES[etat[cle]].classe;};
}
/* un curseur, meme geste que partout ailleurs dans le kit */
function curseur(par, maj, etat, lab, cle, min, max, pas, dec, unite, calc, reg) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},lab));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var i = E("input",{type:"range",min:min,max:max,step:pas,value:etat[cle]});
  i.addEventListener("input", function(){etat[cle]=parseFloat(this.value);calc();});
  c.appendChild(i);
  par.appendChild(c);
  /* le registre permet a un scenario de reposer le curseur */
  if (reg) reg[cle] = i;
  maj.push(function(){v.textContent = frs(etat[cle],dec)+unite;});
}

/* ─────────── ce qu'un kilogramme transporte ─────────── */
OUTILS["latent-sensible"] = {
  titre:"Pourquoi un fluide qui bout, et pas de l'eau",
  intro:"Un kilogramme d'eau qui se refroidit, contre un kilogramme de fluide "+
        "qui s'évapore. Changez l'écart de température de l'eau : il faudrait "+
        "le pousser très loin pour rattraper le changement d'état.",
  monte:function(d){
    var P={f:"R134a", dt:5, phi:10};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Refroidissement de l'eau","dt",2,40,1,0," K",function(){calc();});
    curseur(c2,maj,P,"Puissance à transporter","phi",1,200,1,0," kW",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=190;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Ce qu'un kilogramme transporte, eau contre fluide"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var lv = lvF(P.f, 0);
      var eau = 4.185 * P.dt;
      var rap = lv / eau;
      var qmf = P.phi / lv;          /* kg/s de fluide */
      var qme = P.phi / eau;         /* kg/s d'eau */
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=250, X1=650, MAX=Math.max(lv, eau, 60);
      function bar(y, val, nom, coul, det){
        var w = Math.max(4, (X1-X0)*val/MAX);
        svg.appendChild(S("text",{x:X0-14,y:y+18,"text-anchor":"end","class":"s-nom"},nom));
        svg.appendChild(S("rect",{x:X0,y:y,width:w,height:26,rx:"4",
          fill:V(coul),opacity:"0.75"}));
        svg.appendChild(S("text",{x:X0+w+12,y:y+19,"class":"s-lab"},
          fr(val,0)+" kJ"));
        svg.appendChild(S("text",{x:X0-14,y:y+36,"text-anchor":"end","class":"s-pet"},det));
      }
      bar(40, eau, "1 kg d'eau", "froid", "en se refroidissant de "+fr(P.dt,0)+" K");
      bar(112, lv, "1 kg de "+P.f, FLUIDES[P.f].coul, "en s'évaporant, à 0 °C");
      svg.appendChild(S("text",{x:24,y:22,"class":"s-tit"},
        "CE QU'UN KILOGRAMME EMPORTE"));

      res.innerHTML = "<div class='gros'>"+
        "<span><b>Chaleur latente du "+P.f+"</b><span>"+fr(lv,0)+" kJ/kg</span></span>"+
        "<span><b>L'eau, sur "+fr(P.dt,0)+" K</b><span>"+fr(eau,0)+" kJ/kg</span></span>"+
        "<span><b>Rapport</b><span>× "+frs(rap,1)+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Débit de fluide</b><span>"+frs(qmf*3600,0)+" kg/h</span></span>"+
        "<span><b>Débit d'eau</b><span>"+frs(qme*3600,0)+" kg/h</span></span>"+
        "</div><p>Pour "+fr(P.phi,0)+" kW, il faut faire circuler <b>"+
        frs(qmf*3600,0)+" kg de "+P.f+" par heure</b> contre "+frs(qme*3600,0)+
        " kg d'eau. "+(rap>=8
          ? "Le changement d'état transporte <b>"+frs(rap,1)+" fois plus</b> par "+
            "kilogramme : c'est toute la raison d'employer un fluide qui bout."
          : "En poussant l'écart de l'eau aussi loin, on se rapproche — mais "+
            "40 K sur un circuit d'eau glacée n'existe pas.")+"</p>";
    }
    calc();
  }
};

/* ─────────── une pression, une temperature ─────────── */
OUTILS["saturation-fluides"] = {
  titre:"Le manomètre est un thermomètre",
  intro:"Tant que le liquide et sa vapeur coexistent, la pression fixe la "+
        "température. Déplacez la température : chaque fluide répond par sa "+
        "propre pression, et c'est ce que lit le manifold.",
  monte:function(d){
    var P={t:0};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    curseur(c1,maj,P,"Température de saturation","t",-40,60,1,0," °C",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=300,X0=54,X1=600,Y0=22,Y1=232;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Pression de saturation des fluides selon la température"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);
    function px(t){return X0+(X1-X0)*(t+40)/100;}
    function py(p){return Y1-(Y1-Y0)*Math.log(p/0.4)/Math.log(90/0.4);}

    function calc(){
      maj.forEach(function(x){x();});
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      [0.5,1,2,5,10,20,50].forEach(function(p){
        svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:X0-8,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
          frs(p,p<1?1:0)));
      });
      [-40,-20,0,20,40,60].forEach(function(t){
        svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:px(t),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
          String(t)));
      });
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+38,"text-anchor":"middle","class":"s-nom"},
        "température de saturation, en °C"));
      svg.appendChild(S("text",{x:X0-4,y:Y0-8,"class":"s-nom"},"pression absolue, en bar"));
      /* la courbe de chaque fluide, plus son etiquette a droite */
      var etq=[];
      NOMS_FLUIDES.forEach(function(n){
        var f=FLUIDES[n], pts=[], tmax=Math.min(60,f.tc-1);
        for (var t=-40;t<=tmax;t+=2) pts.push(px(t).toFixed(1)+","+py(psatF(n,t)).toFixed(1));
        svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",
          stroke:V(f.coul),"stroke-width":"2.4","stroke-linejoin":"round"}));
        etq.push({n:n, y:py(psatF(n,tmax)), x:px(tmax), c:f.coul});
      });
      /* on ecarte les etiquettes qui se superposent, de haut en bas */
      etq.sort(function(a,b){return a.y-b.y;});
      for (var i=1;i<etq.length;i++)
        if (etq[i].y - etq[i-1].y < 16) etq[i].y = etq[i-1].y + 16;
      etq.forEach(function(e){
        svg.appendChild(S("text",{x:e.x+10,y:e.y+4,"class":"s-lab",fill:V(e.c)},e.n));
      });
      /* le point courant sur chaque courbe */
      var lignes="";
      NOMS_FLUIDES.forEach(function(n){
        var f=FLUIDES[n];
        if (P.t > f.tc) {
          lignes += "<tr><td><b>"+n+"</b></td><td colspan='2'>au-dessus de son "+
                    "point critique, "+frs(f.tc,0)+" °C : il n'y a plus de "+
                    "liquide, donc plus de saturation</td></tr>";
          return;
        }
        var p=psatF(n,P.t);
        svg.appendChild(S("circle",{cx:px(P.t),cy:py(p),r:"5",fill:V(f.coul),
          stroke:V("carte"),"stroke-width":"1.5"}));
        lignes += "<tr><td><b>"+n+"</b></td><td>"+frs(p,2)+" bar abs.</td><td>"+
                  frs(p-1.013,2)+" bar au manomètre</td></tr>";
      });
      svg.appendChild(S("line",{x1:px(P.t),y1:Y0,x2:px(P.t),y2:Y1,stroke:V("encre"),
        "stroke-width":"1.4","stroke-dasharray":"5 4"}));
      res.innerHTML = "<table><tr><th>Fluide</th><th>Pression absolue</th>"+
        "<th>Ce que lit le manomètre</th></tr>"+lignes+"</table>"+
        "<p>À <b>"+fr(P.t,0)+" °C</b>, chaque fluide a <b>une</b> pression et une "+
        "seule. C'est pourquoi un manomètre gradué en pression porte aussi une "+
        "échelle de température, et pourquoi une simple lecture suffit à savoir "+
        "à quelle température le fluide bout dans l'évaporateur.</p>";
    }
    calc();
  }
};

/* ─────────── le cycle, en le deformant ─────────── */
OUTILS["cycle-frigo"] = {
  titre:"Le cycle, et ce que chaque réglage lui fait",
  intro:"Les quatre points se placent tout seuls dès qu'on donne deux "+
        "températures. Écartez-les, et regardez le taux de compression monter "+
        "pendant que le COP tombe.",
  monte:function(d){
    var P={f:"R134a", t0:-10, tk:40, sc:5, sr:5, phi:10};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Température d'évaporation","t0",-35,15,1,0," °C",function(){calc();});
    curseur(c1,maj,P,"Température de condensation","tk",20,60,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Surchauffe à l'aspiration","sc",0,15,1,0," K",function(){calc();});
    curseur(c2,maj,P,"Sous-refroidissement","sr",0,12,1,0," K",function(){calc();});
    curseur(c2,maj,P,"Puissance frigorifique","phi",1,100,1,0," kW",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=310,X0=52,X1=612,Y0=24,Y1=250;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Cycle frigorifique sur le diagramme pression-enthalpie"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var trans = P.tk >= f.tc - 0.5;
      var ok = (P.tk > P.t0 + 5) && !trans;
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      /* l'echelle suit le fluide : l'ammoniac ne tient pas dans celle du R134a */
      var HMIN=1e9, HMAX=-1e9, PMIN=1e9, PMAX=-1e9;
      f.p.forEach(function(r){
        var s=satF(P.f,r[0]);
        HMIN=Math.min(HMIN,s.hl); HMAX=Math.max(HMAX,s.hv);
        PMIN=Math.min(PMIN,r[1]); PMAX=Math.max(PMAX,r[1]);
      });
      HMAX += (HMAX-HMIN)*0.18;  HMIN -= (HMAX-HMIN)*0.04;
      PMIN *= 0.8; PMAX *= 1.25;
      function px(h){return X0+(X1-X0)*(h-HMIN)/(HMAX-HMIN);}
      function py(p){return Y1-(Y1-Y0)*Math.log(p/PMIN)/Math.log(PMAX/PMIN);}

      /* grille */
      var dec=[1,2,5,10,20,50,100].filter(function(p){return p>=PMIN&&p<=PMAX;});
      dec.forEach(function(p){
        svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:X0-8,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
          String(p)));
      });
      svg.appendChild(S("text",{x:X0-4,y:Y0-8,"class":"s-pet"},"p en bar"));
      svg.appendChild(S("text",{x:X1,y:Y1+34,"text-anchor":"end","class":"s-pet"},
        "h en kJ/kg"));

      /* la cloche */
      var dl="", dv="";
      f.p.forEach(function(r,i){
        var s=satF(P.f,r[0]);
        dl+=(i?"L":"M")+px(s.hl).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
        dv+=(i?"L":"M")+px(s.hv).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
      });
      svg.appendChild(S("path",{d:dl,fill:"none",stroke:V("encre"),"stroke-width":"2"}));
      svg.appendChild(S("path",{d:dv,fill:"none",stroke:V("encre"),"stroke-width":"2"}));

      var msg="", chiffres="";
      if (ok) {
        var e=satF(P.f,P.t0), c=satF(P.f,P.tk);
        var h1=e.hv + f.cpv*P.sc;
        var h3=c.hl - f.cpl*P.sr;
        var q0=h1-h3;
        var tau=c.p/e.p;
        var T1=P.t0+P.sc+273.15;
        var wis=f.cpv*T1*(Math.pow(tau,(f.gam-1)/f.gam)-1);
        var w=wis/0.70;                       /* rendement isentropique 0,70 */
        var h2=h1+w;
        var qk=h2-h3;
        var cop=qk/w, eer=q0/w;
        var carnot=(P.tk+273.15)/(P.tk-P.t0);
        var qm=P.phi/q0;                      /* kg/s */
        var pel=P.phi/eer;

        var pts=[[h1,e.p],[h2,c.p],[h3,c.p],[h3,e.p]];
        var dc="";
        pts.forEach(function(q,i){dc+=(i?"L":"M")+px(q[0]).toFixed(1)+" "+py(q[1]).toFixed(1)+" ";});
        svg.appendChild(S("path",{d:dc+"Z",fill:V(f.coul),"fill-opacity":"0.10",
          stroke:V(f.coul),"stroke-width":"2.5","stroke-linejoin":"round"}));
        pts.forEach(function(q,i){
          svg.appendChild(S("circle",{cx:px(q[0]),cy:py(q[1]),r:"9",fill:V("carte"),
            stroke:V(f.coul),"stroke-width":"2.5"}));
          svg.appendChild(S("text",{x:px(q[0]),y:py(q[1])+4,"text-anchor":"middle",
            "class":"s-pet",fill:V(f.coul)},String(i+1)));
        });
        chiffres = "<div class='gros'>"+
          "<span><b>Basse pression</b><span>"+frs(e.p,2)+" bar</span></span>"+
          "<span><b>Haute pression</b><span>"+frs(c.p,2)+" bar</span></span>"+
          "<span><b>Taux de compression</b><span>"+frs(tau,1)+"</span></span>"+
          "</div><div class='gros' style='margin-top:8px'>"+
          "<span><b>Production frigorifique</b><span>"+fr(q0,0)+" kJ/kg</span></span>"+
          "<span><b>Travail du compresseur</b><span>"+fr(w,0)+" kJ/kg</span></span>"+
          "<span><b>Rejet au condenseur</b><span>"+fr(qk,0)+" kJ/kg</span></span>"+
          "</div><div class='gros' style='margin-top:8px'>"+
          "<span><b>EER, en froid</b><span>"+frs(eer,2)+"</span></span>"+
          "<span><b>COP, en chaud</b><span>"+frs(cop,2)+"</span></span>"+
          "<span><b>Part de Carnot</b><span>"+fr(100*cop/carnot,0)+" %</span></span>"+
          "</div><div class='gros' style='margin-top:8px'>"+
          "<span><b>Débit de fluide</b><span>"+frs(qm*3600,0)+" kg/h</span></span>"+
          "<span><b>Puissance absorbée</b><span>"+frs(pel,2)+" kW</span></span>"+
          "</div>";
        msg = "<p>Le taux de compression vaut <b>"+frs(tau,1)+"</b>. Au-delà de 8, "+
              "un compresseur à piston chauffe, son rendement volumétrique s'écroule "+
              "et il faut passer à deux étages. "+
              (tau>8 ? "<b>C'est le cas ici.</b>" :
               "Ici, un seul étage suffit.")+
              " Chaque kelvin gagné sur l'évaporation vaut 2 à 3 % de COP, et "+
              "chaque kelvin perdu sur la condensation autant.</p>";
      } else if (trans) {
        msg = "<p><b>Le "+P.f+" ne condense plus au-dessus de "+frs(f.tc,0)+" °C</b> : "+
              "c'est sa température critique. Au-delà, il n'existe plus de "+
              "palier liquide-vapeur, la machine travaille en <b>transcritique</b> "+
              "et le condenseur devient un simple refroidisseur de gaz. C'est le "+
              "fonctionnement normal du CO₂, et il demande un autre organe de "+
              "détente.</p>";
      } else {
        msg = "<p><b>La condensation doit rester nettement plus chaude que "+
              "l'évaporation.</b> Sinon la machine n'a plus rien à pomper.</p>";
      }
      res.innerHTML = chiffres + msg;
    }
    calc();
  }
};

/* ─────────── la charge, le local, et la limite ─────────── */
OUTILS["charge-local"] = {
  titre:"Combien de fluide un local supporte",
  intro:"Une fuite complète met toute la charge dans le volume du local. La "+
        "norme EN 378 fixe pour chaque fluide une limite pratique, en kilos par "+
        "mètre cube. Comparez.",
  monte:function(d){
    var P={f:"R134a", m:8, v:60};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Charge de l'installation","m",0.5,80,0.5,1," kg",function(){calc();});
    curseur(c2,maj,P,"Volume du local","v",5,600,5,0," m³",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=150;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Concentration atteinte comparée à la limite pratique"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var conc=P.m/P.v;
      var r=conc/f.lp;
      var mmax=f.lp*P.v;
      var vmin=P.m/f.lp;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=40,X1=640,Y=64,HB=30;
      var ech=Math.max(conc, f.lp)*1.25;
      svg.appendChild(S("text",{x:X0,y:28,"class":"s-tit"},"CONCENTRATION SI TOUT S'ÉCHAPPE"));
      svg.appendChild(S("rect",{x:X0,y:Y,width:X1-X0,height:HB,rx:"4",
        fill:V("trait2"),opacity:"0.35"}));
      var wc=Math.min(X1-X0,(X1-X0)*conc/ech);
      svg.appendChild(S("rect",{x:X0,y:Y,width:Math.max(3,wc),height:HB,rx:"4",
        fill:V(r>1?"chaud":"vert"),opacity:"0.8"}));
      var xl=X0+(X1-X0)*f.lp/ech;
      svg.appendChild(S("line",{x1:xl,y1:Y-12,x2:xl,y2:Y+HB+12,stroke:V("encre"),
        "stroke-width":"2.4"}));
      svg.appendChild(S("text",{x:xl,y:Y-18,"text-anchor":"middle","class":"s-lab"},
        "limite pratique"));
      svg.appendChild(S("text",{x:X0,y:Y+HB+28,"class":"s-pet"},
        frs(conc,3)+" kg/m³ atteints"));
      svg.appendChild(S("text",{x:X1,y:Y+HB+28,"text-anchor":"end","class":"s-pet"},
        "limite "+P.f+" : "+frs(f.lp,3)+" kg/m³"));

      var verdict = r<=1
        ? "<b>Sous la limite.</b> Une fuite totale resterait sous la concentration "+
          "que la norme admet dans un local occupé."
        : "<b>Au-dessus de la limite, d'un facteur "+frs(r,1)+".</b> Il faut un "+
          "local technique dédié, une ventilation mécanique et une détection, ou "+
          "réduire la charge.";
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Concentration atteinte</b><span>"+frs(conc,3)+" kg/m³</span></span>"+
        "<span><b>Limite pratique</b><span>"+frs(f.lp,3)+" kg/m³</span></span>"+
        "<span><b>Classe de sécurité</b><span>"+f.classe+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Charge maximale ici</b><span>"+frs(mmax,1)+" kg</span></span>"+
        "<span><b>Volume minimal</b><span>"+fr(vmin,0)+" m³</span></span>"+
        "<span><b>Équivalent CO₂</b><span>"+fr(P.m*f.gwp/1000,1)+" t</span></span>"+
        "</div><p>"+verdict+" Le "+P.f+" est classé <b>"+f.classe+"</b> : "+
        (f.classe.charAt(0)==="A" ? "faible toxicité" : "toxicité plus élevée")+
        (f.classe.indexOf("3")>0 ? ", et <b>très inflammable</b>."
         : f.classe.indexOf("2L")>0 ? ", et <b>faiblement inflammable</b>."
         : ", non inflammable.")+"</p>";
    }
    calc();
  }
};

/* ─────────── le circuit et ses organes annexes ─────────── */
SCHEMAS["circuit-frigo"] = function(el){
  var W=1000,H=420;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Circuit frigorifique complet : quatre organes principaux et les organes annexes"});
  el.appendChild(svg);
  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function tube(x1,y1,x2,y2,coul,ep){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":ep||3.2,"stroke-linecap":"round"}));
  }
  function boite(x,y,w,h,t,coul,det){
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"5",fill:V("carte")}));
    svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,rx:"5",fill:V(coul),
      opacity:"0.16",stroke:V(coul),"stroke-width":"1.8"}));
    txt(x+w/2,y+h/2+(det?-2:5),t,"s-nom");
    if(det) txt(x+w/2,y+h/2+16,det,"s-pet");
  }
  function rond(cx,cy,r,t,coul){
    svg.appendChild(S("circle",{cx:cx,cy:cy,r:r,fill:V("carte"),
      stroke:V(coul),"stroke-width":"1.8"}));
    txt(cx,cy+4,t,"s-pet",null,coul);
  }

  var YH=118, YB=306, XL=96, XR=884;

  /* les deux zones de pression, posees avant les traits */
  svg.appendChild(S("rect",{x:60,y:74,width:880,height:92,rx:"8",
    fill:V("chaud"),opacity:"0.07"}));
  svg.appendChild(S("rect",{x:60,y:262,width:880,height:92,rx:"8",
    fill:V("froid"),opacity:"0.07"}));
  txt(72,66,"HAUTE PRESSION","s-tit","start","chaud");
  txt(72,376,"BASSE PRESSION","s-tit","start","froid");

  /* la ligne haute : refoulement, condenseur, liquide */
  tube(XL,YH,XR,YH,"chaud");
  boite(470,YH-30,150,60,"CONDENSEUR","chaud","le fluide se liquéfie");
  rond(300,YH,17,"SH","chaud");
  txt(300,YH-28,"séparateur","s-pet");
  txt(300,YH+34,"d'huile","s-pet");
  rond(706,YH,17,"BL","chaud");
  txt(706,YH-28,"bouteille","s-pet");
  txt(706,YH+34,"de liquide","s-pet");
  rond(790,YH,17,"FD","chaud");
  txt(790,YH+34,"déshydrateur","s-pet");

  /* la descente a droite : rouge au-dessus du detendeur, bleu en dessous.
     Le detendeur EST la frontiere : la couleur doit changer sur lui. */
  tube(XR,YH,XR,194,"chaud",3.2);
  tube(XR,250,XR,YB,"froid",3.2);
  boite(XR-72,196,144,52,"DÉTENDEUR","vert","la pression chute");

  /* la ligne basse : evaporateur, aspiration */
  tube(XR,YB,XL,YB,"froid");
  boite(400,YB-30,150,60,"ÉVAPORATEUR","froid","le fluide bout");
  rond(322,YB,17,"BA","froid");
  txt(322,YB+34,"bouteille anti-coups","s-pet");

  /* la montee a gauche : bleu a l aspiration, rouge au refoulement.
     Le compresseur est l autre frontiere. */
  tube(XL,YB,XL,246,"froid",3.2);
  tube(XL,178,XL,YH,"chaud",3.2);
  svg.appendChild(S("circle",{cx:XL,cy:212,r:"32",fill:V("carte"),
    stroke:V("encre"),"stroke-width":"2.2"}));
  svg.appendChild(S("path",{d:"M "+(XL-12)+" 198 L "+(XL+14)+" 212 L "+(XL-12)+" 226 Z",
    fill:V("encre"),opacity:"0.85"}));
  txt(XL,168,"COMPRESSEUR","s-nom");
  txt(XL,262,"il élève la pression","s-pet");

  /* les securites */
  rond(178,YH,15,"HP","chaud");
  rond(178,YB,15,"BP","froid");
  txt(178,YH-26,"pressostat","s-pet");
  txt(178,YB+32,"pressostat","s-pet");

  /* les quatre reperes du cycle */
  [[140,YB,"1"],[140,YH,"2"],[650,YH,"3"],[XR,268,"4"]]
    .forEach(function(q){
      svg.appendChild(S("circle",{cx:q[0],cy:q[1],r:"11",fill:V("encre")}));
      txt(q[0],q[1]+4,q[2],"s-pet",null,"carte");
    });

  var lg=E("p",{"class":"leg-schema"},
    "<b>Quatre organes font le cycle</b> : compresseur, condenseur, détendeur, "+
    "évaporateur. Tout le reste protège la machine ou son huile. La ligne rouge "+
    "est à la haute pression, la bleue à la basse : <b>le détendeur et le "+
    "compresseur sont les deux seules frontières</b> entre elles.");
  (el.parentNode||el).appendChild(lg);
};


/* ─────────── l'embleme d'en-tete : la boucle en petit ─────────── */
SCHEMAS["frigo-embleme"]=function(el){
  var W=300,H=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"La boucle frigorifique : condenseur en haut à la haute pression, "+
                 "évaporateur en bas à la basse pression, compresseur et détendeur "+
                 "aux deux frontières"});
  el.appendChild(svg);

  var XL=54, XR=246, YH=54, YB=196;
  function trait(x1,y1,x2,y2,coul){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":"4","stroke-linecap":"round"}));
  }
  function txt(x,y,t,cls,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":"middle","class":cls||"s-pet",
      fill:V(coul||"encre2")},t));
  }
  /* une pointe qui donne le sens de circulation */
  function pointe(x,y,dx,dy,coul){
    var px=-dy, py=dx;
    svg.appendChild(S("path",{d:"M "+(x+9*dx)+" "+(y+9*dy)+
      " L "+(x-5*dx+6*px)+" "+(y-5*dy+6*py)+
      " L "+(x-5*dx-6*px)+" "+(y-5*dy-6*py)+" Z",fill:V(coul)}));
  }

  /* la boucle, coupee la ou se trouve un organe */
  trait(XL,YH,112,YH,"chaud");   trait(188,YH,XR,YH,"chaud");
  trait(XR,YH,XR,111,"chaud");   trait(XR,139,XR,YB,"froid");
  trait(XR,YB,188,YB,"froid");   trait(112,YB,XL,YB,"froid");
  trait(XL,YB,XL,149,"froid");   trait(XL,101,XL,YH,"chaud");

  pointe(88,YH,1,0,"chaud");     /* le haut part vers la droite */
  pointe(XR,170,0,1,"froid");    /* la droite descend */
  pointe(88,YB,-1,0,"froid");    /* le bas revient vers la gauche */
  pointe(XL,80,0,-1,"chaud");    /* la gauche remonte */

  /* les deux echangeurs */
  function echangeur(cy,coul){
    svg.appendChild(S("rect",{x:112,y:cy-13,width:76,height:26,rx:"4",
      fill:V("carte")}));
    svg.appendChild(S("rect",{x:112,y:cy-13,width:76,height:26,rx:"4",
      fill:V(coul),opacity:"0.20",stroke:V(coul),"stroke-width":"2.2"}));
    for(var i=1;i<=3;i++)
      svg.appendChild(S("line",{x1:112+i*19,y1:cy-8,x2:112+i*19,y2:cy+8,
        stroke:V(coul),"stroke-width":"1.6"}));
  }
  echangeur(YH,"chaud");
  echangeur(YB,"froid");

  /* le compresseur, et le detendeur : les deux frontieres de pression */
  svg.appendChild(S("circle",{cx:XL,cy:125,r:"24",fill:V("carte"),
    stroke:V("encre"),"stroke-width":"2.4"}));
  svg.appendChild(S("path",{d:"M "+(XL-8)+" 113 L "+(XL+11)+" 125 L "+(XL-8)+" 137 Z",
    fill:V("encre"),opacity:"0.85"}));
  svg.appendChild(S("path",{d:"M "+(XR-13)+" 111 L "+(XR+13)+" 139 M "+
    (XR+13)+" 111 L "+(XR-13)+" 139 M "+(XR-13)+" 111 L "+(XR-13)+" 139 M "+
    (XR+13)+" 111 L "+(XR+13)+" 139",
    stroke:V("vert"),"stroke-width":"2.4",fill:"none","stroke-linejoin":"round"}));

  txt(150,30,"HAUTE PRESSION","s-pet","chaud");
  txt(150,86,"condenseur","s-pet");
  txt(150,170,"évaporateur","s-pet");
  txt(150,228,"BASSE PRESSION","s-pet","froid");
};

/* ═══════════════════════════════════════════ LE FROID, NIVEAU 3 (option B)
   Quatre savoirs que le referentiel place a 0 ou 1 pour l'option C et a 3
   pour l'option FCA : les denrees, les huiles, les cycles, l'impact
   environnemental. Un outil par savoir, plus le protocole de refroidissement.

   Tout s'appuie sur la table FLUIDES deja posee plus haut. Les masses
   molaires y ont ete ajoutees pour le calcul de masse volumique de vapeur,
   dont le retour d'huile depend. */

var DENREES = {
  "Fruits et légumes": {cp1:3.8, cp2:1.9, lf:290, tc:-1.0, resp:45},
  "Viande fraîche":    {cp1:3.2, cp2:1.7, lf:250, tc:-1.7, resp:0},
  "Poisson":           {cp1:3.4, cp2:1.8, lf:275, tc:-2.0, resp:0},
  "Produits laitiers": {cp1:3.3, cp2:1.8, lf:270, tc:-1.5, resp:0},
  "Boissons et eau":   {cp1:4.1, cp2:2.0, lf:330, tc: 0.0, resp:0},
  "Produits secs":     {cp1:1.9, cp2:1.5, lf:0,   tc:-5.0, resp:0}
};
var NOMS_DENREES = ["Fruits et légumes","Viande fraîche","Poisson",
                    "Produits laitiers","Boissons et eau","Produits secs"];

/* un menu quelconque, sur le modele de choixFluide */
function choixListe(par, etat, cle, noms, libelle, calc, legende, reg) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},libelle));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var s = E("select",{}, noms.map(function(n){
    return '<option value="'+n+'"'+(n===etat[cle]?" selected":"")+'>'+n+
           "</option>";}).join(""));
  s.addEventListener("change", function(){etat[cle]=this.value;calc();});
  c.appendChild(s);
  par.appendChild(c);
  if (reg) reg[cle] = s;
  return function(){v.textContent = legende ? legende(etat[cle]) : "";};
}
/* l'air humide, en trois lignes : la chambre froide en a besoin pour son
   poste de renouvellement, et le kit ne l'expose pas ailleurs */
function pvsAir(t){return 610.78*Math.exp(17.27*t/(t+237.3));}
function hAir(t, hr){
  var pv = hr*pvsAir(t), r = 622*pv/(101325-pv);
  return 1.006*t + (r/1000)*(2501+1.83*t);
}

/* ─────────── le bilan d'une chambre froide : sept postes ─────────── */
OUTILS["bilan-chambre-froide"] = {
  titre:"Le bilan frigorifique d'une chambre froide",
  intro:"Sept postes, et le plus gros n'est presque jamais celui qu'on croit. "+
        "Déplacez le volume, la consigne, l'isolant, le tonnage : regardez la "+
        "part de chacun se retourner.",
  monte:function(d){
    var P={v:60, tc:2, te:25, e:100, ton:1.5, den:"Fruits et légumes",
           tent:15, marche:16};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    curseur(c1,maj,P,"Volume de la chambre","v",5,600,5,0," m³",function(){calc();});
    curseur(c1,maj,P,"Température de consigne","tc",-25,8,1,0," °C",function(){calc();});
    curseur(c1,maj,P,"Épaisseur d'isolant","e",60,200,10,0," mm",function(){calc();});
    curseur(c1,maj,P,"Température du local","te",15,35,1,0," °C",function(){calc();});
    maj.push(choixListe(c2,P,"den",NOMS_DENREES,"Denrée entreposée",
      function(){calc();},function(n){return DENREES[n].resp?"respire":"inerte";}));
    curseur(c2,maj,P,"Entrées par jour","ton",0,10,0.5,1," t",function(){calc();});
    curseur(c2,maj,P,"Température d'entrée","tent",-18,30,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Marche du groupe","marche",12,22,1,0," h/j",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=250;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Les sept postes du bilan frigorifique"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var D = DENREES[P.den];
      var a = Math.pow(P.v, 1/3), S6 = 6*a*a, sol = a*a;   /* chambre cubique */
      var U = 1/(0.13 + (P.e/1000)/0.023 + 0.04);
      var dt = P.te - P.tc;

      /* 1. parois */
      var q1 = U*S6*dt/1000;
      /* 2. renouvellement d'air : n par 24 h, table usuelle 70/racine(V) */
      var n = 70/Math.sqrt(P.v) * (P.tc<0 ? 0.6 : 1);
      var rho = 353/(P.tc+273.15);
      var dh = Math.max(0, hAir(P.te,0.60) - hAir(P.tc,0.90));
      var q2 = n*P.v*rho*dh/86400;
      /* 3. denrees : sensible au-dessus, latent, sensible au-dessous */
      var m = P.ton*1000, E=0;
      var t1 = Math.max(P.tent, D.tc), t2 = Math.max(P.tc, D.tc);
      if (P.tent > t2) E += m*D.cp1*(t1-t2);
      if (P.tc < D.tc && P.tent > D.tc) { E += m*D.lf; E += m*D.cp2*(D.tc-P.tc); }
      else if (P.tc < D.tc) E += m*D.cp2*(Math.min(P.tent,D.tc)-P.tc);
      var q3 = E/86400;
      /* 4. respiration */
      var q4 = D.resp*P.ton*Math.pow(2,(P.tc-5)/10)/1000;
      /* 5. personnel : 2 personnes, 2 h par jour */
      var q5 = 2*(270-6*P.tc)*2/24/1000;
      /* 6. eclairage : 6 W/m2 de sol, 4 h par jour */
      var q6 = 6*sol*4/24/1000;
      var partiel = q1+q2+q3+q4+q5+q6;
      /* 7. moteurs de ventilateurs, et degivrage en negatif */
      var q7 = partiel*(0.05 + (P.tc<0 ? 0.03 : 0));
      var tot = partiel+q7;
      var maj10 = tot*1.10;
      var inst = maj10*24/P.marche;

      var postes=[["Parois",q1],["Renouvellement d'air",q2],["Denrées",q3],
                  ["Respiration",q4],["Personnel",q5],["Éclairage",q6],
                  ["Ventilateurs, dégivrage",q7]];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=200,X1=590,Y=34,HL=29;
      var mx=Math.max.apply(null,postes.map(function(p){return p[1];}))||1;
      svg.appendChild(S("text",{x:20,y:20,"class":"s-tit"},"LES SEPT POSTES, EN kW"));
      postes.forEach(function(p,i){
        var y=Y+i*HL, w=Math.max(2,(X1-X0)*p[1]/mx);
        svg.appendChild(S("text",{x:X0-12,y:y+14,"text-anchor":"end","class":"s-nom"},p[0]));
        svg.appendChild(S("rect",{x:X0,y:y,width:w,height:19,rx:"3",
          fill:V(p[1]/tot>0.3?"chaud":"froid"),opacity:"0.78"}));
        svg.appendChild(S("text",{x:X0+w+10,y:y+14,"class":"s-lab"},
          frs(p[1],2)+"  "+fr(100*p[1]/tot,0)+" %"));
      });
      var chef = postes.slice().sort(function(x,y){return y[1]-x[1];})[0];
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Surface déperditive</b><span>"+fr(S6,0)+" m²</span></span>"+
        "<span><b>U des panneaux</b><span>"+frs(U,3)+" W/(m²·K)</span></span>"+
        "<span><b>Renouvellements</b><span>"+frs(n,1)+" /jour</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Besoin sur 24 h</b><span>"+frs(tot,2)+" kW</span></span>"+
        "<span><b>Avec 10 % de marge</b><span>"+frs(maj10,2)+" kW</span></span>"+
        "<span><b>À installer, "+fr(P.marche,0)+" h/j</b><span>"+frs(inst,2)+" kW</span></span>"+
        "</div><p><b>Le poste dominant est « "+chef[0].toLowerCase()+" », à "+
        fr(100*chef[1]/tot,0)+" %.</b> "+
        (chef[0]==="Parois"
          ? "Chambre peu chargée : c'est l'enveloppe qui commande, et l'isolant est le bon levier."
          : chef[0]==="Denrées"
          ? "Chambre de refroidissement : c'est la marchandise qui commande, pas les parois. Épaissir l'isolant n'y changerait presque rien."
          : "Poste inhabituel en tête : vérifiez les données avant de dimensionner.")+
        " La puissance à installer se calcule sur les <b>"+fr(P.marche,0)+
        " heures de marche</b>, pas sur 24 : le groupe doit rattraper ses arrêts "+
        "de dégivrage.</p>";
    }
    calc();
  }
};

/* ─────────── le cycle bi-etage, contre le mono-etage ─────────── */
OUTILS["cycle-bietage"] = {
  titre:"Un étage ou deux, et la température de refoulement",
  intro:"Descendez l'évaporation. Le taux de compression monte, et la "+
        "température de refoulement avec lui — c'est elle, pas le COP, qui "+
        "impose le second étage.",
  monte:function(d){
    var P={f:"R134a", t0:-30, tk:40, sc:5};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Température d'évaporation","t0",-45,-5,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Température de condensation","tk",25,50,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Surchauffe","sc",0,12,1,0," K",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=220;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Températures de refoulement comparées, un étage et deux"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f], k=(f.gam-1)/f.gam, ETA=0.70;
      var ok = P.tk > P.t0+10 && P.tk < f.tc-1;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!ok) {
        res.innerHTML = "<p><b>Écart impossible pour ce fluide.</b> La "+
          "condensation doit dépasser l'évaporation d'au moins 10 K et rester "+
          "sous la température critique, "+frs(f.tc,0)+" °C.</p>";
        return;
      }
      var p0=psatF(P.f,P.t0), pk=psatF(P.f,P.tk), pi=Math.sqrt(p0*pk);
      /* la temperature intermediaire, par recherche sur la table */
      var ti=P.t0; for (var t=P.t0; t<=P.tk; t+=0.1) if (psatF(P.f,t)<=pi) ti=t;
      var T1=P.t0+P.sc+273.15, Ti=ti+273.15;
      var tau=pk/p0, tau1=pi/p0, tau2=pk/pi;
      /* mono-etage */
      var wM=f.cpv*T1*(Math.pow(tau,k)-1)/ETA;
      var trefM=(T1*Math.pow(tau,k)-273.15) + (wM-f.cpv*T1*(Math.pow(tau,k)-1))/f.cpv;
      var e0=satF(P.f,P.t0), ek=satF(P.f,P.tk), ei=satF(P.f,ti);
      var h1=e0.hv+f.cpv*P.sc;
      var q0M=h1-ek.hl, eerM=q0M/wM;
      /* bi-etage, bouteille intermediaire a injection totale */
      var w1=f.cpv*T1*(Math.pow(tau1,k)-1)/ETA;
      var w2=f.cpv*Ti*(Math.pow(tau2,k)-1)/ETA;
      var tref1=(T1*Math.pow(tau1,k)-273.15)+(w1-f.cpv*T1*(Math.pow(tau1,k)-1))/f.cpv;
      var tref2=(Ti*Math.pow(tau2,k)-273.15)+(w2-f.cpv*Ti*(Math.pow(tau2,k)-1))/f.cpv;
      var h2bp=h1+w1;
      var ratio=(h2bp-ei.hl)/(ei.hv-ek.hl);          /* debit HP / debit BP */
      var q0B=h1-ei.hl;
      var eerB=q0B/(w1+ratio*w2);
      var gain=100*(eerB/eerM-1);

      /* deux colonnes de temperature de refoulement */
      var X=[190,430], LIM=110;
      var Y0=54, Y1=180, TMAX=Math.max(160, trefM+15);
      function py(t){return Y1-(Y1-Y0)*t/TMAX;}
      svg.appendChild(S("text",{x:20,y:26,"class":"s-tit"},
        "TEMPÉRATURE DE REFOULEMENT"));
      svg.appendChild(S("line",{x1:120,y1:py(LIM),x2:600,y2:py(LIM),
        stroke:V("chaud"),"stroke-width":"2","stroke-dasharray":"6 4"}));
      svg.appendChild(S("text",{x:606,y:py(LIM)+4,"class":"s-pet",fill:V("chaud")},
        "limite 110 °C"));
      [[X[0],trefM,"un seul étage"],[X[1],Math.max(tref1,tref2),"deux étages"]]
        .forEach(function(c){
          var h=Math.max(3,Y1-py(c[1]));
          svg.appendChild(S("rect",{x:c[0]-46,y:py(c[1]),width:92,height:h,rx:"4",
            fill:V(c[1]>LIM?"chaud":"vert"),opacity:"0.8"}));
          /* la valeur rentre dans la barre des qu'il y a la place : posee
             au-dessus, elle vient s'ecrire sur la ligne de limite */
          var dedans = h >= 34;
          svg.appendChild(S("text",{x:c[0],y:py(c[1])+(dedans?21:-10),
            "text-anchor":"middle","class":"s-lab",
            fill:V(dedans?"carte":"encre")},fr(c[1],0)+" °C"));
          svg.appendChild(S("text",{x:c[0],y:Y1+20,"text-anchor":"middle",
            "class":"s-nom"},c[2]));
        });
      svg.appendChild(S("line",{x1:120,y1:Y1,x2:600,y2:Y1,stroke:V("trait"),
        "stroke-width":"1.5"}));

      /* le modele en gaz parfait est cale sur la plage d'enseignement :
         au-dela de 180 °C estimes il ne vaut plus rien, on le dit */
      var horsPlage = trefM > 180;
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Taux total</b><span>"+frs(tau,1)+"</span></span>"+
        "<span><b>Pression intermédiaire</b><span>"+frs(pi,2)+" bar</span></span>"+
        "<span><b>Température intermédiaire</b><span>"+fr(ti,0)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Refoulement, 1 étage</b><span>"+fr(trefM,0)+" °C</span></span>"+
        "<span><b>Refoulement, 2 étages</b><span>"+fr(Math.max(tref1,tref2),0)+" °C</span></span>"+
        "<span><b>Débit HP / débit BP</b><span>"+frs(ratio,2)+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>EER, 1 étage</b><span>"+frs(eerM,2)+"</span></span>"+
        "<span><b>EER, 2 étages</b><span>"+frs(eerB,2)+"</span></span>"+
        "<span><b>Gain</b><span>"+(gain>=0?"+":"")+fr(gain,0)+" %</span></span>"+
        "</div><p>"+(horsPlage
          ? "<b>Estimation hors plage.</b> Au-dela de 180 °C, le calcul en gaz "+
            "parfait surestime largement le refoulement : retenez que ce point "+
            "de fonctionnement est impraticable en un seul étage, pas le nombre "+
            "affiché."
          : trefM>LIM
          ? "<b>Le mono-étage refoule à "+fr(trefM,0)+" °C : au-delà de 110 °C "+
            "l'huile se dégrade et les clapets souffrent.</b> Le second étage "+
            "ramène le refoulement à "+fr(Math.max(tref1,tref2),0)+" °C, et il "+
            "gagne au passage "+fr(gain,0)+" % d'efficacité. C'est la "+
            "température, pas le COP, qui a imposé la décision."
          : "Le mono-étage tient : "+fr(trefM,0)+" °C au refoulement, sous la "+
            "limite de 110 °C. Le bi-étage ne rapporterait que "+fr(gain,0)+
            " % — pas de quoi doubler le compresseur et ajouter une bouteille.")+
        "</p>";
    }
    calc();
  }
};

/* ─────────── TEWI : ce que la machine pese vraiment ─────────── */
OUTILS["tewi"] = {
  titre:"TEWI — la fuite contre la consommation",
  intro:"Le fluide qui s'échappe compte, l'électricité consommée aussi. Le "+
        "TEWI additionne les deux sur la vie de la machine, et dit lequel "+
        "domine.",
  monte:function(d){
    var P={f:"R410A", m:12, fuite:6, vie:15, recup:80, conso:24000, beta:60};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Charge de fluide","m",1,200,1,0," kg",function(){calc();});
    curseur(c1,maj,P,"Taux de fuite annuel","fuite",0,20,0.5,1," %",function(){calc();});
    curseur(c1,maj,P,"Durée de vie","vie",5,25,1,0," ans",function(){calc();});
    curseur(c2,maj,P,"Récupération en fin de vie","recup",0,95,5,0," %",function(){calc();});
    curseur(c2,maj,P,"Consommation annuelle","conso",1000,200000,1000,0," kWh",function(){calc();});
    curseur(c2,maj,P,"Contenu carbone du kWh","beta",20,500,10,0," g",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=150;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Part directe et part indirecte du TEWI"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var fuites = f.gwp*P.m*(P.fuite/100)*P.vie;               /* kg CO2e */
      var finvie = f.gwp*P.m*(1-P.recup/100);
      var direct = fuites+finvie;
      var indirect = P.vie*P.conso*P.beta/1000;
      var tot = direct+indirect;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=30,X1=650,Y=52,HB=34;
      var wd = tot>0 ? (X1-X0)*direct/tot : 0;
      svg.appendChild(S("text",{x:X0,y:30,"class":"s-tit"},
        "TEWI SUR "+fr(P.vie,0)+" ANS"));
      svg.appendChild(S("rect",{x:X0,y:Y,width:X1-X0,height:HB,rx:"4",
        fill:V("froid"),opacity:"0.55"}));
      svg.appendChild(S("rect",{x:X0,y:Y,width:Math.max(2,wd),height:HB,rx:"4",
        fill:V("chaud"),opacity:"0.85"}));
      svg.appendChild(S("text",{x:X0+6,y:Y+HB+22,"class":"s-pet",fill:V("chaud")},
        "direct, le fluide : "+fr(100*direct/tot,0)+" %"));
      svg.appendChild(S("text",{x:X1-6,y:Y+HB+22,"text-anchor":"end","class":"s-pet",
        fill:V("froid")},"indirect, l'électricité : "+fr(100*indirect/tot,0)+" %"));

      res.innerHTML = "<div class='gros'>"+
        "<span><b>GWP du "+P.f+"</b><span>"+fr(f.gwp,0)+"</span></span>"+
        "<span><b>Fuites sur la vie</b><span>"+fr(fuites/1000,1)+" t CO₂e</span></span>"+
        "<span><b>Fin de vie</b><span>"+fr(finvie/1000,1)+" t CO₂e</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Part directe</b><span>"+fr(direct/1000,1)+" t</span></span>"+
        "<span><b>Part indirecte</b><span>"+fr(indirect/1000,1)+" t</span></span>"+
        "<span><b>TEWI total</b><span>"+fr(tot/1000,1)+" t CO₂e</span></span>"+
        "</div><p>"+(direct>indirect
          ? "<b>Ici c'est le fluide qui domine.</b> Changer pour un fluide à bas "+
            "GWP rapporterait plus que tous les gains de rendement possibles."
          : "<b>Ici c'est l'électricité qui domine, à "+fr(100*indirect/tot,0)+
            " %.</b> Un point de COP gagné pèse alors plus qu'une étanchéité "+
            "parfaite — et c'est le cas courant sur un réseau électrique peu "+
            "carboné.")+" Le contenu carbone du kWh est le paramètre qui "+
        "retourne la conclusion : essayez 20 g, puis 400.</p>";
    }
    calc();
  }
};

/* ─────────── le protocole de refroidissement ─────────── */
OUTILS["temps-refroidissement"] = {
  titre:"Descendre une denrée en température",
  intro:"L'énergie à retirer se lit en trois morceaux : avant la congélation, "+
        "pendant, et après. Le palier ne se voit pas au thermomètre et coûte "+
        "pourtant le plus cher.",
  monte:function(d){
    var P={den:"Viande fraîche", m:300, t1:63, t2:3, pui:6};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixListe(c1,P,"den",NOMS_DENREES,"Denrée",function(){calc();},
      function(n){return "congèle à "+frs(DENREES[n].tc,1)+" °C";}));
    curseur(c1,maj,P,"Masse à traiter","m",10,3000,10,0," kg",function(){calc();});
    curseur(c2,maj,P,"Température de départ","t1",-10,90,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Température visée","t2",-30,20,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Puissance disponible","pui",0.5,60,0.5,1," kW",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=260,X0=60,X1=630,Y0=30,Y1=200;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Descente en température, avec le palier de congélation"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function calc(){
      maj.forEach(function(x){x();});
      var D=DENREES[P.den];
      if (P.t2 >= P.t1) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        res.innerHTML="<p><b>La température visée doit être sous celle de départ.</b></p>";
        return;
      }
      var m=P.m;
      var hautT1=Math.max(P.t1,D.tc), hautT2=Math.max(P.t2,D.tc);
      var Es = (P.t1>D.tc) ? m*D.cp1*(hautT1-hautT2) : 0;
      var El = (P.t2<D.tc && P.t1>D.tc) ? m*D.lf : 0;
      var Eb = (P.t2<D.tc) ? m*D.cp2*(Math.min(P.t1,D.tc)-P.t2) : 0;
      var tot=Es+El+Eb;                               /* kJ */
      var h=tot/(P.pui*3600);                          /* heures */
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la courbe : temps en abscisse, temperature en ordonnee */
      var TMAX=Math.max(P.t1,10), TMIN=Math.min(P.t2,-5);
      function px(x){return X0+(X1-X0)*x/Math.max(tot,1);}
      function py(t){return Y1-(Y1-Y0)*(t-TMIN)/(TMAX-TMIN);}
      var pts=[[0,P.t1],[Es,hautT2]];
      if (El>0) pts.push([Es+El, D.tc]);
      if (Eb>0) pts.push([Es+El+Eb, P.t2]);
      svg.appendChild(S("polyline",{points:pts.map(function(q){
        return px(q[0]).toFixed(1)+","+py(q[1]).toFixed(1);}).join(" "),
        fill:"none",stroke:V("froid"),"stroke-width":"3.2","stroke-linejoin":"round"}));
      if (El>0){
        svg.appendChild(S("rect",{x:px(Es),y:Y0,width:px(Es+El)-px(Es),height:Y1-Y0,
          fill:V("chaud"),opacity:"0.10"}));
        svg.appendChild(S("text",{x:(px(Es)+px(Es+El))/2,y:Y0+16,
          "text-anchor":"middle","class":"s-pet",fill:V("chaud")},"palier de congélation"));
      }
      svg.appendChild(S("line",{x1:X0,y1:py(0),x2:X1,y2:py(0),stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:X0-8,y:py(0)+4,"text-anchor":"end","class":"s-pet"},"0 °C"));
      svg.appendChild(S("text",{x:X0-8,y:py(P.t1)+4,"text-anchor":"end","class":"s-pet"},
        fr(P.t1,0)+" °C"));
      svg.appendChild(S("text",{x:X0-8,y:py(P.t2)+4,"text-anchor":"end","class":"s-pet"},
        fr(P.t2,0)+" °C"));
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+34,"text-anchor":"middle","class":"s-nom"},
        "énergie retirée, de gauche à droite"));

      var reg = (P.t1>=63 && P.t2<=10);
      res.innerHTML = "<div class='gros'>"+
        "<span><b>Avant congélation</b><span>"+fr(Es/1000,0)+" MJ</span></span>"+
        "<span><b>Palier</b><span>"+fr(El/1000,0)+" MJ</span></span>"+
        "<span><b>Après congélation</b><span>"+fr(Eb/1000,0)+" MJ</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Énergie totale</b><span>"+fr(tot/3600,0)+" kWh</span></span>"+
        "<span><b>Durée</b><span>"+frs(h,1)+" h</span></span>"+
        "<span><b>Part du palier</b><span>"+fr(100*El/tot,0)+" %</span></span>"+
        "</div><p>"+(El>0
          ? "<b>Le palier pèse "+fr(100*El/tot,0)+" % de l'énergie</b> et le "+
            "thermomètre n'y bouge pas : c'est là que se perdent les protocoles "+
            "réglés au chronomètre plutôt qu'à la sonde à cœur."
          : "Pas de congélation ici : toute l'énergie est sensible, et la "+
            "descente est régulière.")+
        (reg ? " <b>Refroidissement rapide :</b> la réglementation demande de "+
               "passer de +63 à +10 °C en moins de deux heures ; il en faut "+
               frs(h,1)+" avec cette puissance — "+
               (h<=2 ? "c'est tenu." : "<b>c'est trop long.</b>") : "")+"</p>";
    }
    calc();
  }
};

/* ─────────── le retour d'huile dans une colonne montante ─────────── */
OUTILS["retour-huile"] = {
  titre:"La vitesse qui ramène l'huile",
  intro:"L'huile sort du compresseur et doit y revenir. Dans une colonne "+
        "montante, seule la vitesse de la vapeur la remonte. Réduisez la "+
        "puissance : la vitesse tombe, et l'huile reste en bas.",
  monte:function(d){
    var P={f:"R134a", phi:20, t0:-10, tk:40, dia:22, charge:100};
    var maj=[];
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    maj.push(choixFluide(c1,P,"f",function(){calc();}));
    curseur(c1,maj,P,"Puissance frigorifique","phi",1,120,1,0," kW",function(){calc();});
    curseur(c1,maj,P,"Taux de charge du compresseur","charge",30,100,5,0," %",function(){calc();});
    curseur(c2,maj,P,"Température d'évaporation","t0",-35,10,1,0," °C",function(){calc();});
    curseur(c2,maj,P,"Diamètre intérieur","dia",10,80,1,0," mm",function(){calc();});
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    var W=680,H=170;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Vitesse de la vapeur aspirée, comparée au minimum d'entraînement"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);
    var VMIN=6, VMAX=15;         /* montante : entrainement 6 m/s, bruit 15 */

    function calc(){
      maj.forEach(function(x){x();});
      var f=FLUIDES[P.f];
      var e=satF(P.f,P.t0), k=satF(P.f,P.tk);
      var q0=e.hv+f.cpv*5-k.hl;                       /* kJ/kg, surchauffe 5 K */
      var qm=P.phi*(P.charge/100)/q0;                 /* kg/s */
      var rhov=psatF(P.f,P.t0)*1e5*f.M/(8314*(P.t0+273.15+5));
      var Sec=Math.PI*Math.pow(P.dia/1000,2)/4;
      var v=qm/(rhov*Sec);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var X0=40,X1=640,Y=60,HB=30,ECH=Math.max(VMAX*1.15,v*1.1);
      svg.appendChild(S("text",{x:X0,y:32,"class":"s-tit"},
        "VITESSE DANS LA COLONNE MONTANTE"));
      svg.appendChild(S("rect",{x:X0,y:Y,width:X1-X0,height:HB,rx:"4",
        fill:V("trait2"),opacity:"0.35"}));
      var xa=X0+(X1-X0)*VMIN/ECH, xb=X0+(X1-X0)*VMAX/ECH;
      svg.appendChild(S("rect",{x:xa,y:Y,width:xb-xa,height:HB,
        fill:V("vert"),opacity:"0.22"}));
      var w=Math.min(X1-X0,(X1-X0)*v/ECH);
      svg.appendChild(S("rect",{x:X0,y:Y+6,width:Math.max(3,w),height:HB-12,rx:"3",
        fill:V(v<VMIN?"chaud":(v>VMAX?"chaud":"vert")),opacity:"0.9"}));
      [[xa,"6 m/s"],[xb,"15 m/s"]].forEach(function(c){
        svg.appendChild(S("line",{x1:c[0],y1:Y-10,x2:c[0],y2:Y+HB+10,
          stroke:V("encre"),"stroke-width":"2"}));
        svg.appendChild(S("text",{x:c[0],y:Y-16,"text-anchor":"middle","class":"s-pet"},c[1]));
      });
      svg.appendChild(S("text",{x:X0,y:Y+HB+26,"class":"s-lab"},frs(v,1)+" m/s"));

      res.innerHTML = "<div class='gros'>"+
        "<span><b>Production massique</b><span>"+fr(q0,0)+" kJ/kg</span></span>"+
        "<span><b>Débit de fluide</b><span>"+frs(qm*3600,0)+" kg/h</span></span>"+
        "<span><b>Masse volumique vapeur</b><span>"+frs(rhov,1)+" kg/m³</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Vitesse obtenue</b><span>"+frs(v,1)+" m/s</span></span>"+
        "<span><b>Minimum d'entraînement</b><span>6 m/s</span></span>"+
        "<span><b>Verdict</b><span>"+(v<VMIN?"insuffisant":(v>VMAX?"trop rapide":"correct"))+
        "</span></span></div><p>"+(v<VMIN
          ? "<b>Sous 6 m/s, la vapeur ne remonte plus l'huile</b> : elle "+
            "s'accumule dans l'évaporateur, le carter se vide et le compresseur "+
            "grippe. On réduit le diamètre, ou l'on double la colonne pour que "+
            "la vitesse tienne à charge réduite."
          : v>VMAX
          ? "<b>Au-delà de 15 m/s</b>, le bruit et la perte de charge deviennent "+
            "inacceptables : il faut monter d'un diamètre."
          : "La vitesse est dans la plage : l'huile remonte, sans bruit excessif. "+
            "<b>Vérifiez maintenant à charge partielle</b> — une machine qui "+
            "module à 50 % voit sa vitesse tomber de moitié.")+"</p>";
    }
    calc();
  }
};

/* ─────────── la chambre froide et ses apports ─────────── */
SCHEMAS["chambre-froide"] = function(el){
  var W=900,H=380;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les sept apports de chaleur d'une chambre froide"});
  el.appendChild(svg);
  function txt(x,y,t,cls,anc,coul){
    svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
      "class":cls||"s-pet",fill:V(coul||"encre2")},t));
  }
  function fleche(x1,y1,x2,y2,coul){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":"2.6","stroke-linecap":"round"}));
    var dx=x2-x1,dy=y2-y1,n=Math.sqrt(dx*dx+dy*dy);dx/=n;dy/=n;
    var px=-dy,py=dx;
    svg.appendChild(S("path",{d:"M "+x2+" "+y2+" L "+(x2-11*dx+6*px)+" "+
      (y2-11*dy+6*py)+" L "+(x2-11*dx-6*px)+" "+(y2-11*dy-6*py)+" Z",fill:V(coul)}));
  }
  /* la chambre */
  var X0=300,X1=600,Y0=110,Y1=280;
  svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,rx:"6",
    fill:V("froid"),opacity:"0.12",stroke:V("froid"),"stroke-width":"3"}));
  svg.appendChild(S("rect",{x:X0+10,y:Y0+10,width:X1-X0-20,height:Y1-Y0-20,rx:"4",
    fill:"none",stroke:V("froid"),"stroke-width":"1","stroke-dasharray":"4 4"}));
  txt((X0+X1)/2,(Y0+Y1)/2-6,"CHAMBRE FROIDE","s-tit","middle","froid");
  txt((X0+X1)/2,(Y0+Y1)/2+16,"l'isolant est entre les deux traits","s-pet");

  /* les sept apports, quatre a gauche, trois a droite */
  var gauche=[["Parois","à travers l'isolant",150],
              ["Renouvellement d'air","à chaque ouverture",196],
              ["Denrées","ce qu'elles apportent en entrant",242],
              ["Respiration","fruits et légumes seulement",288]];
  gauche.forEach(function(p,i){
    var y=p[2];
    txt(24,y-4,p[0],"s-nom","start","chaud");
    txt(24,y+13,p[1],"s-pet","start");
    fleche(250,y,X0-6,y,"chaud");
  });
  var droite=[["Personnel","250 à 400 W par personne",150],
              ["Éclairage","6 W par m² de sol",196],
              ["Ventilateurs et dégivrage","5 à 8 % du reste",242]];
  droite.forEach(function(p){
    var y=p[2];
    txt(876,y-4,p[0],"s-nom","end","chaud");
    txt(876,y+13,p[1],"s-pet","end");
    fleche(650,y,X1+6,y,"chaud");
  });
  /* l'evaporateur, qui retire tout cela */
  svg.appendChild(S("rect",{x:X0+90,y:Y0+16,width:120,height:24,rx:"3",
    fill:V("carte"),stroke:V("froid"),"stroke-width":"1.8"}));
  for (var i=1;i<=4;i++)
    svg.appendChild(S("line",{x1:X0+90+i*24,y1:Y0+20,x2:X0+90+i*24,y2:Y0+36,
      stroke:V("froid"),"stroke-width":"1.4"}));
  txt((X0+X1)/2,Y0+56,"l'évaporateur retire la somme","s-pet","middle","froid");
  txt((X0+X1)/2,340,"La puissance à installer se calcule sur les heures de marche, pas sur 24 heures.","s-nom");

  var lg=E("p",{"class":"leg-schema"},
    "<b>Sept postes, et leur hiérarchie se retourne selon l'usage.</b> Une "+
    "chambre de conservation est dominée par ses parois ; une chambre de "+
    "refroidissement, par les denrées qui y entrent chaudes. Épaissir "+
    "l'isolant de la seconde ne servirait presque à rien.");
  (el.parentNode||el).appendChild(lg);
};


/* ═══════════════════════════════════════════ LE FROID EN MOUVEMENT
   Deux objets que le site n'avait pas : du temps, et un jeu.

   Tout ce qui precede calcule un regime etabli. Une chambre froide n'y est
   jamais : sa porte s'ouvre, une livraison entre tiede a sept heures, le
   groupe s'arrete pour degivrer. Le premier outil joue une journee en une
   minute, sur un modele a deux noeuds — l'air, qui reagit vite, et la
   marchandise, qui reagit lentement. Le second retourne le diagnostic : au
   lieu de lire une panne, on la devine sur quatre nombres, et l'outil dit
   juste ou faux sans jamais la nommer. */

/* ─────────── une journee de chambre froide ─────────── */
OUTILS["journee-chambre-froide"] = {
  titre:"Une journée de chambre froide, en une minute",
  intro:"Appuyez sur Lire. La porte s'ouvre, une livraison entre à sept heures, "+
        "le groupe démarre et s'arrête. Regardez l'air, puis la marchandise : ils "+
        "ne réagissent pas à la même vitesse, et c'est toute l'histoire.",
  monte:function(d){
    var DEF={v:60, tc:2, e:100, te:25, ton:1.5, tent:15, ouv:30, pinst:3, stock:2,
             den:"Fruits et légumes"};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    /* les scenarios du cours : chaque heure de la page en appelle un par son nom */
    var SCEN=[
      ["Libre", null],
      ["1 · La nuit seule",        {ouv:0, ton:0}],
      ["2 · Les portes seules",    {ouv:80, ton:0}],
      ["3 · La livraison",         {}],
      ["4 · Chambre négative",     {tc:-20, den:"Viande fraîche", ton:1, tent:-5,
                                    stock:3, pinst:4, e:150}],
      ["5 · Groupe trop petit",    {pinst:1.5}],
      ["6 · Groupe généreux",      {pinst:8}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===3?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    /* un curseur bouge a la main : on repasse en libre, sans relancer */
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    curseur(c1,maj,P,"Volume de la chambre","v",10,400,10,0," m³",touche,reg);
    curseur(c1,maj,P,"Consigne","tc",-22,8,1,0," °C",touche,reg);
    curseur(c1,maj,P,"Isolant","e",60,200,10,0," mm",touche,reg);
    curseur(c1,maj,P,"Puissance du groupe","pinst",1,20,0.5,1," kW",touche,reg);
    curseur(c1,maj,P,"Stock en chambre","stock",0.5,10,0.5,1," t",touche,reg);
    maj.push(choixListe(c2,P,"den",NOMS_DENREES,"Denrée",touche,
      function(n){return DENREES[n].resp?"respire":"inerte";},reg));
    curseur(c2,maj,P,"Livraison de 7 h","ton",0,6,0.5,1," t",touche,reg);
    curseur(c2,maj,P,"Température de la livraison","tent",-18,30,1,0," °C",touche,reg);
    curseur(c2,maj,P,"Ouvertures de porte","ouv",0,80,5,0," /jour",touche,reg);
    curseur(c2,maj,P,"Température du local","te",15,35,1,0," °C",touche,reg);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    /* les commandes de lecture : lire, avancer d'une heure, recommencer */
    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bHeure=E("button",{"class":"bt",type:"button"},"+ 1 h");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bHeure); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=330, X0=44,X1=428,Y0=28,Y1=224, XB=482,XB1=664;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Températures de l'air et de la marchandise sur vingt-quatre heures"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var S_={}, anim=null, acc=0, dernier=0;
    var POSTES=["Parois","Porte","Livraison","Respiration","Personnel","Éclairage",
                "Ventilateurs","Dégivrage"];

    function reset(){
      maj.forEach(function(x){x();});
      if (anim) { cancelAnimationFrame(anim); anim=null; bLire.textContent="Lire"; }
      var D=DENREES[P.den];
      S_={m:0, Tair:P.tc, Tg:P.tc, mg:P.stock*1000, comp:false, degiv:0,
          run:0, hors:0, E:{}, trA:[], trG:[], cmp:[], D:D, tmax:P.tc+14,
          livre:false};
      POSTES.forEach(function(p){S_.E[p]=0;});
      /* le calendrier des ouvertures : reparties de 6 h a 18 h, 2 min chacune */
      S_.porte=new Array(1440);
      for (var i=0;i<1440;i++) S_.porte[i]=false;
      if (P.ouv>0){
        var pas=720/P.ouv;
        for (var k=0;k<P.ouv;k++){
          var t=Math.round(360+k*pas);
          for (var j=0;j<2;j++) if (t+j<1440) S_.porte[t+j]=true;
        }
      }
      /* la livraison compte des son entree : c'est la chaleur qu'il faudra sortir */
      S_.E["Livraison"]=P.ton*1000*D.cp1*Math.max(0,P.tent-P.tc)/3600;
      dessine(); acc=0;
    }

    function pas(){
      var m=S_.m; if (m>=1440) return;
      var D=S_.D, h=m/60;
      var a=Math.pow(P.v,1/3), S6=6*a*a, sol=a*a;
      var U=1/(0.13+(P.e/1000)/0.023+0.04);
      var Cair=1000+1.3*P.v, Cg=Math.max(1,S_.mg*D.cp1);
      /* la livraison de sept heures : melange a la marchandise en stock */
      if (m===420 && P.ton>0 && !S_.livre){
        var md=P.ton*1000;
        S_.Tg=(S_.mg*S_.Tg+md*P.tent)/(S_.mg+md); S_.mg+=md; S_.livre=true;
      }
      /* degivrage : 20 min toutes les 6 h, groupe a l'arret */
      var deg=(m%360)<20;
      var present=(h>=8&&h<10)||(h>=14&&h<16);
      var ecl=h>=6&&h<18;
      var rho=353/(S_.Tair+273.15);
      var dh=Math.max(0,hAir(P.te,0.60)-hAir(S_.Tair,0.90));
      var q={};
      q["Parois"]=U*S6*(P.te-S_.Tair)/1000;
      q["Porte"]=S_.porte[m]?0.3*P.v*rho*dh/120:0;
      q["Personnel"]=present?2*(0.27-0.006*S_.Tair):0;
      q["Éclairage"]=ecl?6*sol/1000:0;
      q["Ventilateurs"]=0.06*P.pinst;
      q["Dégivrage"]=(deg&&P.tc<0)?2:0;
      q["Respiration"]=D.resp*(S_.mg/1000)*Math.pow(2,(S_.Tg-5)/10)/1000;
      /* thermostat sur l'air, avec un differentiel de 1 K */
      if (deg) S_.comp=false;
      else if (!S_.comp && S_.Tair>P.tc+1) S_.comp=true;
      else if (S_.comp && S_.Tair<P.tc-1) S_.comp=false;
      var qEvap=S_.comp?-P.pinst:0;
      var qGA=0.6*(S_.Tg-S_.Tair);
      S_.Tair+=(q["Parois"]+q["Porte"]+q["Personnel"]+q["Éclairage"]+q["Ventilateurs"]+
                q["Dégivrage"]+qEvap+qGA)*60/Cair;
      S_.Tg+=(-qGA+q["Respiration"])*60/Cg;
      for (var k in q) if (k!=="Livraison") S_.E[k]+=q[k]/60;
      S_.q=q; S_.qGA=qGA;
      if (S_.comp) S_.run++;
      if (S_.Tair>P.tc+2) S_.hors++;
      S_.trA.push(S_.Tair); S_.trG.push(S_.Tg); S_.cmp.push(S_.comp?(deg?2:1):(deg?2:0));
      S_.tmax=Math.max(S_.tmax,S_.Tg+2,S_.Tair+2);
      S_.m++;
    }

    function px(m){return X0+(X1-X0)*m/1440;}
    function py(t){var lo=P.tc-4, hi=S_.tmax; return Y1-(Y1-Y0)*(t-lo)/(hi-lo);}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
        "class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }

    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la grille des heures */
      [0,6,12,18,24].forEach(function(hh){
        svg.appendChild(S("line",{x1:px(hh*60),y1:Y0,x2:px(hh*60),y2:Y1,
          stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(hh*60),Y1+34,hh+" h");
      });
      /* la bande de consigne */
      svg.appendChild(S("rect",{x:X0,y:py(P.tc+1),width:X1-X0,height:py(P.tc-1)-py(P.tc+1),
        fill:V("vert"),opacity:"0.12"}));
      txt(X0-8,py(P.tc)+4,fr(P.tc,0)+" °C","s-pet","end");
      txt(X0-8,py(S_.tmax)+4,fr(S_.tmax,0)+" °C","s-pet","end");
      /* les ouvertures de porte, en tirets sur le haut */
      for (var i=0;i<1440;i+=2) if (S_.porte[i])
        svg.appendChild(S("line",{x1:px(i),y1:Y0-8,x2:px(i),y2:Y0-2,
          stroke:V("encre2"),"stroke-width":"1.2"}));
      txt(X0,Y0-12,"portes","s-pet","start");
      /* la livraison */
      if (P.ton>0){
        svg.appendChild(S("line",{x1:px(420),y1:Y0,x2:px(420),y2:Y1,
          stroke:V("chaud"),"stroke-width":"1.4","stroke-dasharray":"5 4"}));
        txt(px(420)+5,Y0+12,"livraison","s-pet","start","chaud");
      }
      /* les deux traces */
      function trace(arr,coul,ep){
        if (arr.length<2) return;
        var pts=[];
        for (var i=0;i<arr.length;i++) pts.push(px(i).toFixed(1)+","+py(arr[i]).toFixed(1));
        svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V(coul),
          "stroke-width":ep,"stroke-linejoin":"round"}));
      }
      trace(S_.trG,"vert",2.4);
      trace(S_.trA,"froid",2.4);
      /* le groupe : une barre sous le graphe */
      var yb=Y1+8;
      for (var i=0;i<S_.cmp.length;i++){
        if (S_.cmp[i]===0) continue;
        svg.appendChild(S("rect",{x:px(i),y:yb,width:Math.max(0.5,px(i+1)-px(i)),height:10,
          fill:V(S_.cmp[i]===2?"tiede":"froid")}));
      }
      txt(X1+6,yb+9,"groupe","s-pet","start");
      /* le curseur du temps */
      if (S_.m>0 && S_.m<1440)
        svg.appendChild(S("line",{x1:px(S_.m),y1:Y0,x2:px(S_.m),y2:Y1+18,
          stroke:V("encre"),"stroke-width":"1.6"}));
      /* legende */
      svg.appendChild(S("line",{x1:X0,y1:Y1+48,x2:X0+22,y2:Y1+48,stroke:V("froid"),"stroke-width":"3"}));
      txt(X0+28,Y1+52,"air","s-pet","start");
      svg.appendChild(S("line",{x1:X0+70,y1:Y1+48,x2:X0+92,y2:Y1+48,stroke:V("vert"),"stroke-width":"3"}));
      txt(X0+98,Y1+52,"marchandise","s-pet","start");
      /* les postes, a droite, en kWh cumules */
      txt(XB,Y0-12,"CE QUI EST ENTRÉ, EN kWh","s-tit","start");
      var tot=0; POSTES.forEach(function(p){tot+=S_.E[p];});
      var mx=Math.max(3,tot);
      POSTES.forEach(function(p,i){
        var y=Y0+6+i*26, w=(XB1-XB-110)*S_.E[p]/mx;
        txt(XB,y+12,p,"s-pet","start");
        svg.appendChild(S("rect",{x:XB+92,y:y+2,width:Math.max(1,w),height:13,rx:"2",
          fill:V(S_.E[p]/mx>0.3?"chaud":"froid"),opacity:"0.8"}));
        txt(XB+96+w,y+13,frs(S_.E[p],1),"s-pet","start");
      });
      /* le compte rendu */
      var fini=S_.m>=1440, hh=Math.floor(S_.m/60), mm=S_.m%60;
      var chef=POSTES.slice().sort(function(a,b){return S_.E[b]-S_.E[a];})[0];
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heure</b><span>"+hh+" h "+(mm<10?"0":"")+mm+"</span></span>"+
        "<span><b>Air</b><span>"+frs(S_.Tair,1)+" °C</span></span>"+
        "<span><b>Marchandise</b><span>"+frs(S_.Tg,1)+" °C</span></span>"+
        "<span><b>Groupe</b><span>"+(S_.comp?"en marche":"à l'arrêt")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        (function(){
          if (!S_.q) return "";
          var qq=S_.q, tq=0, chefq="", vq=-1;
          for (var k in qq){ tq+=qq[k]; if (qq[k]>vq){vq=qq[k];chefq=k;} }
          if (S_.qGA>vq){ chefq="Marchandise → air"; vq=S_.qGA; }
          return "<span><b>Entre maintenant</b><span>"+frs(tq+Math.max(0,S_.qGA),2)+" kW</span></span>"+
                 "<span><b>Le plus gros, à cet instant</b><span>"+chefq.toLowerCase()+"</span></span>"+
                 "</div><div class='gros' style='margin-top:8px'>";
        })()+
        "<span><b>Taux de marche</b><span>"+fr(S_.m?100*S_.run/S_.m:0,0)+" %</span></span>"+
        "<span><b>Hors consigne</b><span>"+fr(S_.hors/60,1)+" h</span></span>"+
        "<span><b>Entré au total</b><span>"+frs(tot,1)+" kWh</span></span>"+
        "</div><p>"+(!S_.m
          ? "Appuyez sur <b>Lire</b>. Puis changez une chose — la puissance du groupe, "+
            "la livraison, les ouvertures — et relisez la journée."
          : fini
          ? "<b>Journée finie.</b> Poste dominant : "+chef.toLowerCase()+", "+
            fr(100*S_.E[chef]/tot,0)+" % de ce qui est entré. "+
            (S_.hors>60
              ? "L'air est resté <b>"+fr(S_.hors/60,1)+" h au-dessus de la consigne</b> : "+
                (S_.run/S_.m>0.9 ? "le groupe a tourné presque sans arrêt, il est trop petit pour cette livraison."
                                 : "regardez à quelle heure, et ce qui s'est ouvert ou est entré à ce moment-là.")
              : "La consigne a tenu ; le groupe a tourné "+fr(100*S_.run/S_.m,0)+" % du temps"+
                (S_.run/S_.m<0.5 ? ", il a de la réserve." : "."))
          : "La marchandise réagit dix fois plus lentement que l'air : c'est elle qui "+
            "porte la chaleur de la livraison, et le groupe la sort pendant des heures.")+
        "</p>";
    }

    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.024; dernier=ts;        /* 24 minutes simulees par seconde */
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.m<1440) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){ cancelAnimationFrame(anim); anim=null; bLire.textContent="Lire"; return; }
      if (S_.m>=1440) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bHeure.addEventListener("click",function(){
      if (anim){ cancelAnimationFrame(anim); anim=null; bLire.textContent="Lire"; }
      if (S_.m>=1440) return;
      for (var i=0;i<60 && S_.m<1440;i++) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

/* ─────────── lire la machine : quatre nombres, une panne ─────────── */
var PANNES=[
  {n:"Machine saine", d:[0,0,0,0],
   lire:"Tout est dans la plage : BP et HP au régime, surchauffe de 5 à 8 K, "+
        "sous-refroidissement de 3 à 6 K."},
  {n:"Manque de fluide", d:[-6,-4,16,-3.5],
   lire:"Peu de liquide au condenseur : le sous-refroidissement disparaît. Peu de "+
        "liquide à l'évaporateur : il s'évapore trop tôt, la surchauffe explose. "+
        "Les deux pressions baissent."},
  {n:"Excès de fluide", d:[1,4,-2,9],
   lire:"Le condenseur se remplit de liquide : le sous-refroidissement grimpe et la "+
        "HP monte. L'évaporateur est mieux alimenté, la surchauffe baisse un peu."},
  {n:"Condenseur encrassé", d:[1,12,0,-2],
   lire:"La chaleur ne part plus : la HP monte fort, le liquide sort à peine "+
        "sous-refroidi, le refoulement chauffe. La BP suit légèrement."},
  {n:"Évaporateur givré", d:[-7,-2,-4,0],
   lire:"L'air ne passe plus : peu de chaleur entre, la BP chute et la surchauffe "+
        "s'effondre. Le liquide menace d'atteindre le compresseur."},
  {n:"Détendeur bloqué ouvert", d:[4,1,-6,0],
   lire:"Trop de fluide envoyé : l'évaporateur est noyé, la surchauffe tombe à zéro "+
        "et la BP monte. Coups de liquide en vue."},
  {n:"Détendeur bouché", d:[-10,-3,18,3],
   lire:"Presque plus de fluide envoyé : la BP s'effondre, la surchauffe explose, et "+
        "le liquide s'accumule au condenseur, sous-refroidissement en hausse."},
  {n:"Incondensables", d:[0,8,0,5],
   lire:"De l'air est pris dans le circuit : il gonfle la HP sans rien condenser. Le "+
        "sous-refroidissement paraît élevé, parce que la température de condensation "+
        "lue sur la pression est fausse."}
];

OUTILS["diagnostic-frigo"] = {
  titre:"Lire la machine : quatre nombres, une panne",
  intro:"Deux pressions, une surchauffe, un sous-refroidissement : c'est tout ce "+
        "qu'un frigoriste relève avant de rien démonter. Choisissez une panne et "+
        "regardez les aiguilles bouger. Puis tirez-en une à l'aveugle, et trouvez.",
  monte:function(d){
    var BASE={t0:-10, tk:40, sc:6, sr:4};
    var P={panne:0, aveugle:false, cache:-1, essais:0};
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    /* le menu des pannes, a observer */
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Panne à observer"));
    var v=E("span",{"class":"v"},""); ch.appendChild(v);
    var sel=E("select",{},PANNES.map(function(p,i){
      return '<option value="'+i+'"'+(i===0?" selected":"")+'>'+p.n+"</option>";}).join(""));
    sel.addEventListener("change",function(){P.panne=+this.value;P.aveugle=false;calc();});
    ch.appendChild(sel); c1.appendChild(ch);
    var cmd=E("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"});
    var bTirer=E("button",{"class":"bt p",type:"button"},"Tirer une panne à l'aveugle");
    cmd.appendChild(bTirer); c2.appendChild(cmd);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);

    var W=680,H=210;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Quatre cadrans : basse pression, haute pression, surchauffe, sous-refroidissement"});
    d.appendChild(svg);
    var choix=E("div",{"class":"qq",style:"display:none;border:0;padding:0"});
    var choixP=E("p",{},"Quelle est la panne ?");
    var choixL=E("div",{"class":"choix"});
    choix.appendChild(choixP); choix.appendChild(choixL); d.appendChild(choix);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var CAD=[
      {n:"Basse pression",u:"bar",lo:0.4,hi:5,  nlo:1.6,nhi:2.6, dec:2},
      {n:"Haute pression",u:"bar",lo:5,  hi:25, nlo:8,  nhi:13,  dec:1},
      {n:"Surchauffe",    u:"K",  lo:0,  hi:30, nlo:4,  nhi:10,  dec:0},
      {n:"Sous-refroid.", u:"K",  lo:0,  hi:16, nlo:2,  nhi:7,   dec:0}
    ];
    function lectures(i){
      var dd=PANNES[i].d;
      return [psatF("R134a",BASE.t0+dd[0]), psatF("R134a",BASE.tk+dd[1]),
              Math.max(0,BASE.sc+dd[2]), Math.max(0,BASE.sr+dd[3])];
    }
    function cadran(cx,cy,r,c,val){
      /* un arc de 240 degres, de -210 a +30 */
      function ang(x){var f=Math.min(1,Math.max(0,(x-c.lo)/(c.hi-c.lo)));return (-210+240*f)*Math.PI/180;}
      function pt(a,rr){return [cx+rr*Math.cos(a),cy+rr*Math.sin(a)];}
      function arc(a1,a2,rr,coul,ep,op){
        var p1=pt(a1,rr),p2=pt(a2,rr), gr=(a2-a1)>Math.PI?1:0;
        svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+
          " A "+rr+" "+rr+" 0 "+gr+" 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),
          fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linecap":"round",opacity:op||1}));
      }
      arc(ang(c.lo),ang(c.hi),r,"trait2",7,0.7);
      arc(ang(c.nlo),ang(c.nhi),r,"vert",7,0.55);
      var a=ang(val), p=pt(a,r-6), hors=val<c.nlo||val>c.nhi;
      svg.appendChild(S("line",{x1:cx,y1:cy,x2:p[0].toFixed(1),y2:p[1].toFixed(1),
        stroke:V(hors?"chaud":"encre"),"stroke-width":"2.6","stroke-linecap":"round"}));
      svg.appendChild(S("circle",{cx:cx,cy:cy,r:"4",fill:V(hors?"chaud":"encre")}));
      svg.appendChild(S("text",{x:cx,y:cy+r-4,"text-anchor":"middle","class":"s-lab",
        fill:V(hors?"chaud":"encre")},frs(val,c.dec)+" "+c.u));
      svg.appendChild(S("text",{x:cx,y:cy+r+18,"text-anchor":"middle","class":"s-pet"},c.n));
    }
    function dessine(vals){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      CAD.forEach(function(c,i){cadran(90+i*167,100,62,c,vals[i]);});
    }
    function calc(){
      choix.style.display="none";
      v.textContent=PANNES[P.panne].n==="Machine saine"?"référence":"observée";
      var L=lectures(P.panne); dessine(L);
      var dirs=CAD.map(function(c,i){return L[i]<c.nlo?"↓":(L[i]>c.nhi?"↑":"=");});
      res.innerHTML="<div class='gros'>"+CAD.map(function(c,i){
        return "<span><b>"+c.n+"</b><span>"+dirs[i]+"</span></span>";}).join("")+
        "</div><p><b>"+PANNES[P.panne].n+".</b> "+PANNES[P.panne].lire+"</p>";
    }
    function aveugle(){
      P.aveugle=true; P.essais=0;
      /* jamais la machine saine seule : on tire parmi les pannes, une fois sur
         six la saine pour garder l'eleve honnete */
      P.cache=Math.random()<0.16?0:1+Math.floor(Math.random()*(PANNES.length-1));
      sel.value="0"; v.textContent="à trouver";
      dessine(lectures(P.cache));
      choixL.innerHTML="";
      PANNES.forEach(function(p,i){
        var b=E("button",{type:"button"},p.n);
        b.addEventListener("click",function(){juger(i,b);});
        choixL.appendChild(b);
      });
      choix.style.display="block";
      res.innerHTML="<p>Lisez les quatre aiguilles. <b>Commencez par la surchauffe</b> : "+
        "elle dit ce qui se passe à l'évaporateur. Puis le sous-refroidissement, qui "+
        "dit ce qui se passe au condenseur. Les pressions confirment.</p>";
    }
    function juger(i,b){
      P.essais++;
      var L=lectures(P.cache), G=lectures(i);
      if (i===P.cache){
        b.className="juste";
        [].slice.call(choixL.children).forEach(function(x){x.disabled=true;});
        res.innerHTML="<p><b>Juste</b>, en "+P.essais+" essai"+(P.essais>1?"s":"")+". "+
          PANNES[i].lire+"</p>";
        return;
      }
      b.className="faux"; b.disabled=true;
      /* la methode, sans la reponse : quelle aiguille contredit ce choix */
      var k=-1, ecart=0;
      for (var j=0;j<4;j++){
        var e=Math.abs(L[j]-G[j])/(CAD[j].hi-CAD[j].lo);
        if (e>ecart){ecart=e;k=j;}
      }
      var sens=L[k]>G[k]?"plus haut":"plus bas";
      res.innerHTML="<p><b>Non.</b> Avec cette panne, le cadran « "+CAD[k].n+" » "+
        "serait "+(L[k]>G[k]?"plus bas":"plus haut")+" que ce que vous lisez : ici il "+
        "est "+sens+". Reprenez par l'aiguille qui sort le plus de sa zone verte.</p>";
    }
    bTirer.addEventListener("click",aveugle);
    calc();
  }
};

/* ─────────── l'embleme d'en-tete : vingt-quatre heures ─────────── */
SCHEMAS["journee-embleme"]=function(el){
  var W=300,H=250, cx=150, cy=128, R=92;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un cadran de vingt-quatre heures, avec la journée d'activité et une température qui oscille"});
  el.appendChild(svg);
  function pt(h,r){var a=(h/24*360-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:V("encre"),"stroke-width":"2.2"}));
  for (var h=0;h<24;h++){
    var a=pt(h,R), b=pt(h,R-(h%6?6:12));
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("encre"),
      "stroke-width":h%6?"1.2":"2.2"}));
  }
  /* la journee d'activite, de 6 a 18 h, en arc exterieur */
  var p1=pt(6,R+9), p2=pt(18,R+9);
  svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+(R+9)+" "+(R+9)+
    " 0 0 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V("chaud"),
    "stroke-width":"5","stroke-linecap":"round"}));
  /* la temperature de l'air, qui oscille autour de la consigne */
  var pts=[];
  for (var i=0;i<=96;i++){
    var t=i/4, r=R-38+8*Math.sin(t*2.2)+(t>7&&t<13?9*Math.exp(-(t-7)/3):0);
    var q=pt(t,r); pts.push(q[0].toFixed(1)+","+q[1].toFixed(1));
  }
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R-38,fill:"none",stroke:V("vert"),
    "stroke-width":"1.2","stroke-dasharray":"4 4"}));
  svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V("froid"),
    "stroke-width":"2.6","stroke-linejoin":"round"}));
  svg.appendChild(S("text",{x:cx,y:cy+6,"text-anchor":"middle","class":"s-tit",
    fill:V("encre2")},"24 h"));
  svg.appendChild(S("text",{x:cx,y:cy-R-16,"text-anchor":"middle","class":"s-pet"},"0 h"));
  svg.appendChild(S("text",{x:cx,y:cy+R+26,"text-anchor":"middle","class":"s-pet"},"12 h"));
};


/* ═══════════════════════════════════════════ LA CTA EN MOUVEMENT
   La salle polyvalente du DS n° 8 — 240 m², 960 m³, jusqu'a cent personnes —
   servie par sa double flux : 1,80 kg/s souffles, 0,80 kg/s d'air neuf au
   plus, un recuperateur a plaques, une batterie chaude, une batterie froide,
   un humidificateur a vapeur. Une journee en une minute.

   Le local est un seul noeud thermique, plus une teneur en eau et un CO2. La
   centrale regule sa temperature de soufflage en proportionnel sur l'ambiance,
   module son air neuf sur le CO2, et passe en free-cooling quand l'exterieur
   le permet. Ce qui est paye et ce qui est gratuit sont comptes a part. */

function rsatAir(t){var p=pvsAir(t);return 622*p/(101325-p);}
function rAir(t,hr){var p=hr*pvsAir(t);return 622*p/(101325-p);}
function hAirR(t,r){return 1.006*t+(r/1000)*(2501+1.83*t);}
function hrAir(t,r){return 100*(101325*r/(622+r))/pvsAir(t);}

OUTILS["journee-cta"] = {
  titre:"Une journée de centrale de traitement d'air, en une minute",
  intro:"Appuyez sur Lire. La salle se remplit à neuf heures, le CO₂ monte, la "+
        "centrale ouvre son air neuf, le récupérateur rend ce qu'il peut, les "+
        "batteries font le reste. Deux courbes : la température, et le CO₂.",
  monte:function(d){
    var DEF={tm:-3, amp:4, hr:85, sol:4, cons:20, bp:4, eps:60, pers:60,
             occ:"Deux réunions", marche:"24 h sur 24", fc:"Autorisé", hum:"Oui"};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Nuit d'hiver, salle vide, centrale en marche", {occ:"Salle vide"}],
      ["2 · Journée d'hiver, deux réunions", {}],
      ["3 · La même, sans récupérateur", {eps:0}],
      ["4 · Mi-saison : le soleil, et le free-cooling", {tm:14, amp:8, hr:60, sol:12}],
      ["5 · Été : deux réunions et une remise de diplômes", {tm:27, amp:6, hr:55, sol:10,
                                                            cons:25, occ:"Réunions et soirée", hum:"Non"}],
      ["6 · Hiver, programme horaire de 6 h à 20 h", {marche:"6 h à 20 h"}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===2?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    curseur(c1,maj,P,"Température extérieure moyenne","tm",-10,35,1,0," °C",touche,reg);
    curseur(c1,maj,P,"Amplitude jour-nuit","amp",0,14,1,0," K",touche,reg);
    curseur(c1,maj,P,"Humidité extérieure","hr",30,95,5,0," %",touche,reg);
    curseur(c1,maj,P,"Ensoleillement maximal","sol",0,25,1,0," kW",touche,reg);
    maj.push(choixListe(c1,P,"occ",["Salle vide","Deux réunions","Réunions et soirée"],
      "Occupation",touche,null,reg));
    curseur(c2,maj,P,"Consigne d'ambiance","cons",18,27,0.5,1," °C",touche,reg);
    curseur(c2,maj,P,"Bande proportionnelle","bp",1,10,0.5,1," K",touche,reg);
    curseur(c2,maj,P,"Efficacité du récupérateur","eps",0,85,5,0," %",touche,reg);
    curseur(c2,maj,P,"Personnes en réunion","pers",0,100,10,0,"",touche,reg);
    maj.push(choixListe(c2,P,"marche",["24 h sur 24","6 h à 20 h"],"Centrale",touche,null,reg));
    maj.push(choixListe(c2,P,"fc",["Autorisé","Interdit"],"Free-cooling",touche,null,reg));
    maj.push(choixListe(c2,P,"hum",["Oui","Non"],"Humidificateur en hiver",touche,null,reg));
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bHeure=E("button",{"class":"bt",type:"button"},"+ 1 h");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bHeure); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=340, X0=44,X1=420,Y0=28,Y1=224, XB=488,XB1=664;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Température de la salle et CO₂ sur vingt-quatre heures, avec le régime de la centrale"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    /* la salle et la centrale */
    var VOL=960, CZ=9000, UA=0.6, MAIR=1150, QM=1.8, QNMAX=0.8, QNMIN=0.2, FANS=2.16;
    var S_={}, anim=null, acc=0, dernier=0;
    var POSTES=["Chaud","Froid","Vapeur","Ventilateurs","Récupéré","Free-cooling"];
    var PAYES=4;

    function occ(h){
      var n=0;
      if (P.occ!=="Salle vide" && ((h>=9&&h<12)||(h>=14&&h<17))) n=P.pers;
      if (P.occ==="Réunions et soirée" && h>=18 && h<20) n=100;
      return n;
    }
    function text(h){return P.tm+(P.amp/2)*Math.cos(2*Math.PI*(h-15)/24);}
    function reset(){
      maj.forEach(function(x){x();});
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      var t0=text(0);
      S_={m:0, Tz:P.cons, rz:Math.min(rAir(P.cons,0.45), rAir(t0,P.hr/100)+0.5), co2:480,
          E:{}, trT:[], trX:[], trC:[], mode:[], hors:0, occmin:0, co2max:0, eau:0,
          q:null, tmax:P.cons+8, tmin:Math.min(P.cons-6, t0-2)};
      POSTES.forEach(function(p){S_.E[p]=0;});
      dessine(); acc=0;
    }

    function pas(){
      var m=S_.m; if (m>=1440) return;
      var h=m/60, n=occ(h), Te=text(h), re=rAir(Te,P.hr/100);
      var sol=(h>7&&h<18)?P.sol*Math.sin(Math.PI*(h-7)/11):0;
      var on=(P.marche==="24 h sur 24")||(h>=6&&h<20);
      var gains=n*0.07+(n>0?1.44:0)+sol+UA*(Te-S_.Tz);      /* kW vers la salle */
      var vap=n*65/3600;                                       /* g/s */
      var mode=0, Ts=S_.Tz, rs=S_.rz, qn=0, qmix=0;
      var q={"Chaud":0,"Froid":0,"Vapeur":0,"Ventilateurs":0,"Récupéré":0,"Free-cooling":0};
      if (on){
        q["Ventilateurs"]=FANS;
        qn=Math.min(QNMAX,Math.max(QNMIN,QNMIN+(S_.co2-800)/400*(QNMAX-QNMIN)));
        var besoinFroid=S_.Tz>P.cons+0.5, fcok=P.fc==="Autorisé"&&Te<S_.Tz-2&&Te>12;
        if (besoinFroid&&fcok){
          /* premier etage, l'air exterieur, gratuit ; second etage, la batterie,
             si cela ne suffit pas : c'est la sequence d'une vraie centrale */
          mode=3; qn=QM; Ts=Te; rs=re;
          q["Free-cooling"]=QM*1.02*(S_.Tz-Te);
          var Tc0=Math.max(14,Math.min(35,P.cons+(P.cons-S_.Tz)*(21/P.bp)));
          if (Tc0<Te-0.2){
            mode=2; Ts=Tc0; rs=Math.min(re,0.9*rsatAir(Tc0));
            q["Froid"]=QM*(hAirR(Te,re)-hAirR(Tc0,rs));
          }
        } else {
          var eps=P.eps/100;
          var Trec=Te+eps*(S_.Tz-Te);
          q["Récupéré"]=qn*1.02*Math.abs(Trec-Te);
          var Tm=(qn*Trec+(QM-qn)*S_.Tz)/QM, rm=(qn*re+(QM-qn)*S_.rz)/QM;
          var Tc=P.cons+(P.cons-S_.Tz)*(21/P.bp);
          Tc=Math.max(14,Math.min(35,Tc));
          if (Tc>Tm+0.2){ mode=1; Ts=Tc; rs=rm; q["Chaud"]=QM*1.02*(Tc-Tm); }
          else if (Tc<Tm-0.2){
            mode=2; Ts=Tc; rs=Math.min(rm,0.9*rsatAir(Tc));
            q["Froid"]=QM*(hAirR(Tm,rm)-hAirR(Tc,rs));
          } else { mode=4; Ts=Tm; rs=rm; }
          if (P.hum==="Oui" && mode!==2 && hrAir(Ts,rs)<30){
            var rcible=rAir(Ts,0.35), dr=Math.max(0,rcible-rs);
            rs=rcible; q["Vapeur"]=QM*dr/1000*2700; S_.eau+=QM*dr/1000*60;
          }
        }
        Ts+=1;                                                  /* le ventilateur */
        gains+=QM*1.02*(Ts-S_.Tz);
        S_.rz+=(vap+QM*(rs-S_.rz))*60/MAIR;
        S_.co2+=(1e6*n*5e-6/VOL-(qn/1.2/VOL)*(S_.co2-420))*60;
      } else {
        /* centrale arretee : il ne reste que l'infiltration, 0,2 volume par heure */
        S_.rz+=(vap-(0.2/3600)*MAIR*(S_.rz-re))*60/MAIR;
        S_.co2+=(1e6*n*5e-6/VOL-(0.2/3600)*(S_.co2-420))*60;
      }
      S_.Tz+=gains*60/CZ;
      for (var k in q) S_.E[k]+=q[k]/60;
      S_.q=q; S_.qn=qn; S_.Ts=Ts; S_.n=n; S_.Te=Te;
      if (n>0){ S_.occmin++; if (Math.abs(S_.Tz-P.cons)>1.5) S_.hors++; }
      S_.co2max=Math.max(S_.co2max,S_.co2);
      S_.trT.push(S_.Tz); S_.trX.push(Te); S_.trC.push(S_.co2); S_.mode.push(mode);
      S_.tmax=Math.max(S_.tmax,S_.Tz+2,Te+2); S_.tmin=Math.min(S_.tmin,Te-2,S_.Tz-2);
      S_.m++;
    }

    function px(m){return X0+(X1-X0)*m/1440;}
    function py(t){return Y1-(Y1-Y0)*(t-S_.tmin)/(S_.tmax-S_.tmin);}
    function pc(c){return Y1-(Y1-Y0)*Math.min(1,(c-400)/1800);}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
        "class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* l'occupation, en fond */
      for (var i=0;i<1440;i+=10) if (occ(i/60)>0)
        svg.appendChild(S("rect",{x:px(i),y:Y0,width:px(i+10)-px(i)+0.5,height:Y1-Y0,
          fill:V("tiede"),opacity:"0.10"}));
      [0,6,12,18,24].forEach(function(hh){
        svg.appendChild(S("line",{x1:px(hh*60),y1:Y0,x2:px(hh*60),y2:Y1,
          stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(hh*60),Y1+34,hh+" h");
      });
      svg.appendChild(S("rect",{x:X0,y:py(P.cons+1),width:X1-X0,height:py(P.cons-1)-py(P.cons+1),
        fill:V("vert"),opacity:"0.12"}));
      txt(X0-8,py(P.cons)+4,frs(P.cons,0)+" °C","s-pet","end");
      txt(X0-8,py(S_.tmax)+4,fr(S_.tmax,0)+" °C","s-pet","end");
      txt(X0-8,py(S_.tmin)+4,fr(S_.tmin,0)+" °C","s-pet","end");
      txt(X1+6,pc(1000)+4,"1 000 ppm","s-pet","start","vert");
      svg.appendChild(S("line",{x1:X0,y1:pc(1000),x2:X1,y2:pc(1000),stroke:V("vert"),
        "stroke-width":"1","stroke-dasharray":"3 4"}));
      function trace(arr,f,coul,ep,dash){
        if (arr.length<2) return;
        var pts=[];
        for (var i=0;i<arr.length;i++) pts.push(px(i).toFixed(1)+","+f(arr[i]).toFixed(1));
        var a={points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"};
        if (dash) a["stroke-dasharray"]=dash;
        svg.appendChild(S("polyline",a));
      }
      trace(S_.trX,py,"encre2",1.4,"5 4");
      trace(S_.trC,pc,"vert",2);
      trace(S_.trT,py,"froid",2.6);
      /* la centrale : sa barre de regime */
      var yb=Y1+8, COL=["","chaud","froid","vert","trait"];
      for (var i=0;i<S_.mode.length;i++){
        if (!S_.mode[i]) continue;
        svg.appendChild(S("rect",{x:px(i),y:yb,width:Math.max(0.5,px(i+1)-px(i)),height:10,
          fill:V(COL[S_.mode[i]]),opacity:S_.mode[i]===4?"0.5":"1"}));
      }
      txt(X1+6,yb+9,"centrale","s-pet","start");
      if (S_.m>0&&S_.m<1440)
        svg.appendChild(S("line",{x1:px(S_.m),y1:Y0,x2:px(S_.m),y2:Y1+18,stroke:V("encre"),"stroke-width":"1.6"}));
      /* legende */
      var yl=Y1+50;
      [["froid","salle"],["encre2","extérieur"],["vert","CO₂"]].forEach(function(l,i){
        var x=X0+i*118;
        svg.appendChild(S("line",{x1:x,y1:yl,x2:x+20,y2:yl,stroke:V(l[0]),"stroke-width":"3"}));
        txt(x+26,yl+4,l[1],"s-pet","start");
      });
      [["chaud","chauffe"],["froid","refroidit"],["vert","free-cooling"]].forEach(function(l,i){
        var x=X0+i*118;
        svg.appendChild(S("rect",{x:x,y:yl+14,width:20,height:8,fill:V(l[0])}));
        txt(x+26,yl+22,l[1],"s-pet","start");
      });
      /* les postes, payes puis gratuits */
      txt(XB,Y0-12,"PAYÉ, EN kWh","s-tit","start","chaud");
      var tot=0; POSTES.forEach(function(p){tot+=S_.E[p];});
      var mx=Math.max(3,tot);
      POSTES.forEach(function(p,i){
        var y=Y0+6+i*27+(i>=PAYES?18:0), w=(XB1-XB-104)*S_.E[p]/mx;
        if (i===PAYES) txt(XB,y-8,"GRATUIT","s-tit","start","vert");
        txt(XB,y+12,p,"s-pet","start");
        svg.appendChild(S("rect",{x:XB+86,y:y+2,width:Math.max(1,w),height:13,rx:"2",
          fill:V(i>=PAYES?"vert":"chaud"),opacity:"0.8"}));
        txt(XB+90+w,y+13,frs(S_.E[p],1),"s-pet","start");
      });
      /* le compte rendu */
      var fini=S_.m>=1440, hh=Math.floor(S_.m/60), mm=S_.m%60;
      var paye=0, gratuit=0;
      POSTES.forEach(function(p,i){ if(i<PAYES) paye+=S_.E[p]; else gratuit+=S_.E[p]; });
      var MODES=["à l'arrêt","chauffe","refroidit","free-cooling","souffle neutre"];
      var chef="", vq=-1; if (S_.q) for (var k in S_.q) if (S_.q[k]>vq){vq=S_.q[k];chef=k;}
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heure</b><span>"+hh+" h "+(mm<10?"0":"")+mm+"</span></span>"+
        "<span><b>Salle</b><span>"+frs(S_.Tz,1)+" °C · "+fr(hrAir(S_.Tz,S_.rz),0)+" %</span></span>"+
        "<span><b>Extérieur</b><span>"+frs(S_.Te!==undefined?S_.Te:text(0),1)+" °C</span></span>"+
        "<span><b>CO₂</b><span>"+fr(S_.co2,0)+" ppm</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Centrale</b><span>"+MODES[S_.mode.length?S_.mode[S_.mode.length-1]:0]+"</span></span>"+
        "<span><b>Soufflage</b><span>"+(S_.Ts!==undefined&&S_.mode.length&&S_.mode[S_.mode.length-1]?frs(S_.Ts,1)+" °C":"—")+"</span></span>"+
        "<span><b>Air neuf</b><span>"+(S_.qn?frs(S_.qn,2)+" kg/s":"—")+"</span></span>"+
        "<span><b>Le plus gros, à cet instant</b><span>"+(chef?chef.toLowerCase():"—")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Payé</b><span>"+frs(paye,1)+" kWh</span></span>"+
        "<span><b>Gratuit</b><span>"+frs(gratuit,1)+" kWh</span></span>"+
        "<span><b>Eau d'humidification</b><span>"+frs(S_.eau,1)+" L</span></span>"+
        "<span><b>Hors confort, occupé</b><span>"+fr(S_.hors/60,1)+" h</span></span>"+
        "</div><p>"+(!S_.m
          ? "Appuyez sur <b>Lire</b>, ou avancez d'une heure. Puis changez une chose, "+
            "et relisez la journée."
          : fini
          ? "<b>Journée finie.</b> "+frs(paye,1)+" kWh payés, "+frs(gratuit,1)+" kWh rendus "+
            "par le récupérateur et le free-cooling. CO₂ maximal : "+fr(S_.co2max,0)+" ppm"+
            (S_.co2max>1200?", <b>trop haut</b> : l'air neuf n'a pas suivi.":".")+
            (S_.hors>60?" La salle est restée <b>"+fr(S_.hors/60,1)+" h hors confort</b> en présence : regardez à quelle heure.":"")
          : "Le CO₂ monte avec les personnes et la centrale ouvre son air neuf pour le "+
            "tenir sous 1 000 ppm. Le récupérateur rend en vert ce que la batterie "+
            "n'a pas à fournir en rouge.")+"</p>";
    }
    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.024; dernier=ts;
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.m<1440) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";return;}
      if (S_.m>=1440) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bHeure.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      if (S_.m>=1440) return;
      for (var i=0;i<60&&S_.m<1440;i++) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

/* ─────────── lire la centrale : cinq temperatures, une panne ─────────── */
var PANNES_CTA=[
  {n:"Centrale saine", r:[-5,9.4,14.7,29,30,100,120,850],
   lire:"L'air neuf gagne 14 K au récupérateur, le mélange est entre les deux, la "+
        "batterie porte à 29 et le ventilateur ajoute son kelvin. Débit, filtre et CO₂ "+
        "dans la plage."},
  {n:"Filtre colmaté", r:[-5,9.4,14.7,33,34,70,270,850],
   lire:"La perte de charge du filtre a doublé et le débit est tombé. À eau égale, "+
        "la batterie chauffe davantage le peu d'air qui passe : la température monte "+
        "alors que la puissance baisse."},
  {n:"Récupérateur givré ou bipasse ouvert", r:[-5,-4,8.3,29,30,90,120,850],
   lire:"L'air neuf ressort du récupérateur presque à sa température d'entrée : rien "+
        "n'est récupéré. Le mélange est plus froid, la batterie compense, et la "+
        "facture aussi."},
  {n:"Registre d'air neuf bloqué fermé", r:[-5,9.4,19,29,30,100,120,1900],
   lire:"Le mélange est à la température de reprise : tout est recyclé. Le CO₂ monte "+
        "sans que rien ne l'arrête. C'est la panne qu'on ne voit pas au thermomètre "+
        "et que les occupants sentent."},
  {n:"Registre d'air neuf bloqué ouvert", r:[-5,9.4,9.4,29,30,100,120,520],
   lire:"Le mélange est à la température de sortie du récupérateur : tout air neuf, "+
        "aucun recyclage. Le CO₂ est très bas, et la batterie chauffe deux fois plus "+
        "d'air neuf qu'il n'en faut."},
  {n:"Vanne de batterie chaude bloquée fermée", r:[-5,9.4,14.7,14.7,15.7,100,120,850],
   lire:"L'air sort de la batterie comme il y est entré. Le seul écart qui reste est "+
        "le kelvin du ventilateur : la salle se refroidit, régulateur en pleine demande."},
  {n:"Courroie de ventilateur cassée", r:[-5,11,16,16,16,0,0,1600],
   lire:"Plus de débit, plus de perte de charge au filtre. Les sondes lisent un air "+
        "immobile qui s'homogénéise, et le CO₂ grimpe puisque rien n'entre."}
];

OUTILS["diagnostic-cta"] = {
  titre:"Lire la centrale : cinq températures, une panne",
  intro:"Un thermomètre à chaque caisson, un débit, une perte de charge au filtre, "+
        "un CO₂ à la reprise. Choisissez une panne et regardez le profil se "+
        "déformer. Puis tirez-en une à l'aveugle, et trouvez.",
  monte:function(d){
    var P={panne:0, cache:-1, essais:0};
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Panne à observer"));
    var v=E("span",{"class":"v"},""); ch.appendChild(v);
    var sel=E("select",{},PANNES_CTA.map(function(p,i){
      return '<option value="'+i+'"'+(i===0?" selected":"")+'>'+p.n+"</option>";}).join(""));
    sel.addEventListener("change",function(){P.panne=+this.value;calc();});
    ch.appendChild(sel); c1.appendChild(ch);
    var cmd=E("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"});
    var bTirer=E("button",{"class":"bt p",type:"button"},"Tirer une panne à l'aveugle");
    cmd.appendChild(bTirer); c2.appendChild(cmd);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);

    var W=680,H=266, X0=70,X1=420,Y0=30,Y1=170;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Profil de température le long de la centrale, et trois cadrans"});
    d.appendChild(svg);
    var choix=E("div",{"class":"qq",style:"display:none;border:0;padding:0"});
    choix.appendChild(E("p",{},"Quelle est la panne ?"));
    var choixL=E("div",{"class":"choix"}); choix.appendChild(choixL); d.appendChild(choix);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var STA=["extérieur","après récup.","mélange","après batterie","soufflage"];
    var SAIN=PANNES_CTA[0].r;
    var CAD=[{n:"Débit",u:"%",lo:0,hi:120,nlo:90,nhi:110,dec:0},
             {n:"Filtre",u:"Pa",lo:0,hi:320,nlo:80,nhi:180,dec:0},
             {n:"CO₂ reprise",u:"ppm",lo:400,hi:2200,nlo:600,nhi:1100,dec:0}];
    function py(t){return Y1-(Y1-Y0)*(t+8)/48;}
    function cadran(cx,cy,r,c,val){
      function ang(x){var f=Math.min(1,Math.max(0,(x-c.lo)/(c.hi-c.lo)));return (-210+240*f)*Math.PI/180;}
      function pt(a,rr){return [cx+rr*Math.cos(a),cy+rr*Math.sin(a)];}
      function arc(a1,a2,rr,coul,ep,op){
        var p1=pt(a1,rr),p2=pt(a2,rr), gr=(a2-a1)>Math.PI?1:0;
        svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+rr+" "+rr+
          " 0 "+gr+" 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V(coul),
          "stroke-width":ep,"stroke-linecap":"round",opacity:op||1}));
      }
      arc(ang(c.lo),ang(c.hi),r,"trait2",6,0.7);
      arc(ang(c.nlo),ang(c.nhi),r,"vert",6,0.55);
      var a=ang(val), p=pt(a,r-5), hors=val<c.nlo||val>c.nhi;
      svg.appendChild(S("line",{x1:cx,y1:cy,x2:p[0].toFixed(1),y2:p[1].toFixed(1),
        stroke:V(hors?"chaud":"encre"),"stroke-width":"2.4","stroke-linecap":"round"}));
      svg.appendChild(S("circle",{cx:cx,cy:cy,r:"3.5",fill:V(hors?"chaud":"encre")}));
      svg.appendChild(S("text",{x:cx,y:cy+r-2,"text-anchor":"middle","class":"s-lab",
        fill:V(hors?"chaud":"encre")},fr(val,c.dec)+" "+c.u));
      svg.appendChild(S("text",{x:cx,y:cy+r+16,"text-anchor":"middle","class":"s-pet"},c.n));
    }
    function dessine(r){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la bande normale autour du profil sain, puis le profil lu */
      var bande="", haut=[], bas=[];
      STA.forEach(function(s,i){
        var x=X0+(X1-X0)*i/4;
        haut.push(x.toFixed(1)+","+py(SAIN[i]+2.5).toFixed(1));
        bas.unshift(x.toFixed(1)+","+py(SAIN[i]-2.5).toFixed(1));
        svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1,stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        svg.appendChild(S("text",{x:x,y:Y1+18,"text-anchor":"middle","class":"s-pet"},s));
      });
      svg.appendChild(S("polygon",{points:haut.concat(bas).join(" "),fill:V("vert"),opacity:"0.16"}));
      [-5,10,20,30].forEach(function(t){
        svg.appendChild(S("text",{x:X0-10,y:py(t)+4,"text-anchor":"end","class":"s-pet"},t+" °C"));
      });
      var pts=[];
      STA.forEach(function(s,i){pts.push((X0+(X1-X0)*i/4).toFixed(1)+","+py(r[i]).toFixed(1));});
      svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V("encre"),
        "stroke-width":"2.6","stroke-linejoin":"round"}));
      STA.forEach(function(s,i){
        var x=X0+(X1-X0)*i/4, hors=Math.abs(r[i]-SAIN[i])>2.5;
        svg.appendChild(S("circle",{cx:x,cy:py(r[i]),r:"5",fill:V(hors?"chaud":"encre"),
          stroke:V("carte"),"stroke-width":"1.5"}));
        svg.appendChild(S("text",{x:x,y:py(r[i])-11,"text-anchor":"middle","class":"s-lab",
          fill:V(hors?"chaud":"encre")},frs(r[i],1)));
      });
      cadran(500,96,44,CAD[0],r[5]);
      cadran(596,96,44,CAD[1],r[6]);
      cadran(548,192,44,CAD[2],r[7]);
    }
    function calc(){
      choix.style.display="none";
      v.textContent=P.panne===0?"référence":"observée";
      dessine(PANNES_CTA[P.panne].r);
      res.innerHTML="<p><b>"+PANNES_CTA[P.panne].n+".</b> "+PANNES_CTA[P.panne].lire+"</p>";
    }
    function aveugle(){
      P.essais=0;
      P.cache=Math.random()<0.15?0:1+Math.floor(Math.random()*(PANNES_CTA.length-1));
      sel.value="0"; v.textContent="à trouver";
      dessine(PANNES_CTA[P.cache].r);
      choixL.innerHTML="";
      PANNES_CTA.forEach(function(p,i){
        var b=E("button",{type:"button"},p.n);
        b.addEventListener("click",function(){juger(i,b);});
        choixL.appendChild(b);
      });
      choix.style.display="block";
      res.innerHTML="<p>Suivez l'air de gauche à droite. <b>Chaque caisson doit ajouter "+
        "ce qu'il ajoute d'habitude</b> : le récupérateur 14 K, le mélange une moyenne, "+
        "la batterie le reste. Le premier caisson qui ne fait pas son travail désigne "+
        "la panne ; les trois cadrans confirment.</p>";
    }
    function juger(i,b){
      P.essais++;
      var L=PANNES_CTA[P.cache].r, G=PANNES_CTA[i].r;
      if (i===P.cache){
        b.className="juste";
        [].slice.call(choixL.children).forEach(function(x){x.disabled=true;});
        res.innerHTML="<p><b>Juste</b>, en "+P.essais+" essai"+(P.essais>1?"s":"")+". "+PANNES_CTA[i].lire+"</p>";
        return;
      }
      b.className="faux"; b.disabled=true;
      var ECH=[48,48,48,48,48,120,320,1800], NOMS=STA.concat(["débit","perte du filtre","CO₂"]);
      var k=-1, ecart=0;
      for (var j=0;j<8;j++){ var e=Math.abs(L[j]-G[j])/ECH[j]; if (e>ecart){ecart=e;k=j;} }
      res.innerHTML="<p><b>Non.</b> Avec cette panne, la lecture « "+NOMS[k]+" » serait "+
        (L[k]>G[k]?"plus basse":"plus haute")+" que ce que vous lisez. Reprenez le "+
        "profil caisson par caisson.</p>";
    }
    bTirer.addEventListener("click",aveugle);
    calc();
  }
};

/* ─────────── l'embleme d'en-tete : la journee de la salle ─────────── */
SCHEMAS["cta-embleme"]=function(el){
  var W=300,H=250, cx=150, cy=128, R=92;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un cadran de vingt-quatre heures : la salle occupée, sa température, son CO₂"});
  el.appendChild(svg);
  function pt(h,r){var a=(h/24*360-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:V("encre"),"stroke-width":"2.2"}));
  for (var h=0;h<24;h++){
    var a=pt(h,R), b=pt(h,R-(h%6?6:12));
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("encre"),"stroke-width":h%6?"1.2":"2.2"}));
  }
  [[9,12],[14,17]].forEach(function(o){
    var p1=pt(o[0],R+9), p2=pt(o[1],R+9);
    svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+(R+9)+" "+(R+9)+
      " 0 0 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V("tiede"),
      "stroke-width":"6","stroke-linecap":"round"}));
  });
  function courbe(f,coul,ep){
    var pts=[];
    for (var i=0;i<=96;i++){var t=i/4,q=pt(t,f(t));pts.push(q[0].toFixed(1)+","+q[1].toFixed(1));}
    svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"}));
  }
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R-38,fill:"none",stroke:V("vert"),"stroke-width":"1.2","stroke-dasharray":"4 4"}));
  courbe(function(t){var o=((t>9&&t<12)||(t>14&&t<17))?1:0;return R-38+5*o+2*Math.sin(t*3);},"froid",2.4);
  courbe(function(t){var o=((t>9&&t<12)||(t>14&&t<17))?14*Math.min(1,(t%5)/1.5):0;return R-58+o;},"vert",2);
  svg.appendChild(S("text",{x:cx,y:cy+6,"text-anchor":"middle","class":"s-tit",fill:V("encre2")},"24 h"));
  svg.appendChild(S("text",{x:cx,y:cy-R-16,"text-anchor":"middle","class":"s-pet"},"0 h"));
  svg.appendChild(S("text",{x:cx,y:cy+R+26,"text-anchor":"middle","class":"s-pet"},"12 h"));
};


/* ═══════════════════════════════════════════ LA CHAUFFERIE EN MOUVEMENT
   Le batiment du fil rouge : une aile de college, 1 500 m², 75 kW de
   radiateurs en 80/60 a la base, une chaudiere a condensation de 90 kW qui
   module, un ballon d'ECS de 1 500 L avec sa boucle, une loi d'eau, un reduit
   de nuit. Une journee en une minute.

   Le batiment est un seul noeud thermique. Les radiateurs emettent en
   puissance 1,3 de l'ecart moyen eau-air ; le retour se deduit du debit,
   constant. Le rendement de la chaudiere depend de la temperature de l'eau
   qui LUI revient — et un bipasse peut la rechauffer, ce qui tue la
   condensation. L'ECS a priorite sur le chauffage. */

OUTILS["journee-chaufferie"] = {
  titre:"Une journée de chaufferie, en une minute",
  intro:"Appuyez sur Lire. À cinq heures la relance, à sept heures les douches "+
        "de l'internat, à huit heures les élèves, la nuit le réduit. Regardez le "+
        "départ suivre la loi d'eau, et le retour décider si la chaudière condense.",
  monte:function(d){
    var DEF={tm:0, amp:6, sol:8, pente:2.5, para:0, reduit:3, relance:5, bipasse:0,
             pch:90, pers:150, ecs:1600, occ:"Collège en semaine"};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Nuit d'hiver, sans réduit", {reduit:0}],
      ["2 · Journée d'hiver, réduit de nuit", {}],
      ["3 · Loi d'eau trop haute", {para:8}],
      ["4 · La vanne qui tue la condensation", {bipasse:50}],
      ["5 · Le matin de l'internat", {ecs:3200}],
      ["6 · Mi-saison : la chaudière court-cycle", {tm:12, amp:6, sol:12}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===2?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    curseur(c1,maj,P,"Température extérieure moyenne","tm",-10,18,1,0," °C",touche,reg);
    curseur(c1,maj,P,"Amplitude jour-nuit","amp",0,12,1,0," K",touche,reg);
    curseur(c1,maj,P,"Ensoleillement maximal","sol",0,30,1,0," kW",touche,reg);
    curseur(c1,maj,P,"Pente de la loi d'eau","pente",0.6,3,0.1,1,"",touche,reg);
    curseur(c1,maj,P,"Parallèle","para",-10,10,1,0," K",touche,reg);
    curseur(c1,maj,P,"Réduit de nuit","reduit",0,8,0.5,1," K",touche,reg);
    curseur(c2,maj,P,"Heure de relance","relance",3,8,0.5,1," h",touche,reg);
    curseur(c2,maj,P,"Bipasse vers le retour chaudière","bipasse",0,80,10,0," %",touche,reg);
    curseur(c2,maj,P,"Puissance de la chaudière","pch",40,160,10,0," kW",touche,reg);
    curseur(c2,maj,P,"Élèves présents","pers",0,300,25,0,"",touche,reg);
    curseur(c2,maj,P,"ECS puisée par jour","ecs",0,4000,200,0," L",touche,reg);
    maj.push(choixListe(c2,P,"occ",["Collège en semaine","Bâtiment vide"],"Occupation",touche,null,reg));
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bHeure=E("button",{"class":"bt",type:"button"},"+ 1 h");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bHeure); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=350, X0=44,X1=420,Y0=28,Y1=224, XB=488,XB1=664;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Températures de départ, de retour, du bâtiment et du ballon sur vingt-quatre heures"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var CZ=60000, UA=3.0, PHIN=75, QM=0.896, VB=1500, BOUCLE=1.4, PECS=40, POMPES=0.31, CONS=19;
    var S_={}, anim=null, acc=0, dernier=0;
    var POSTES=["Gaz PCI","Chauffage","ECS","Boucle ECS","Fumées","Pompes"];

    function text(h){return P.tm+(P.amp/2)*Math.cos(2*Math.PI*(h-15)/24);}
    function occ(h){return (P.occ==="Collège en semaine"&&((h>=8&&h<12)||(h>=14&&h<17)))?P.pers:0;}
    function puisage(m){                       /* litres a 40 °C, par minute */
      var h=m/60;
      if (h>=7&&h<7.5)  return P.ecs*0.50/30;
      if (h>=12&&h<13)  return P.ecs*0.15/60;
      if (h>=19&&h<19.5)return P.ecs*0.35/30;
      return 0;
    }
    function consigne(h){ return (h>=P.relance&&h<22)?CONS:CONS-P.reduit; }
    function rendement(tret){ return 0.90+0.19*Math.max(0,Math.min(1,(57-tret)/32)); }

    function reset(){
      maj.forEach(function(x){x();});
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      S_={m:0, Tz:CONS-P.reduit*0.6, Tret:40, Tb:60, ecsOn:false, ch:true, cyc:0,
          E:{}, trZ:[], trX:[], trD:[], trR:[], trB:[], cond:[], hors:0, occmin:0,
          eau:0, q:null, tmax:90, tmin:Math.min(-8,text(0)-2), dernierEtat:false};
      POSTES.forEach(function(p){S_.E[p]=0;});
      dessine(); acc=0;
    }

    function pas(){
      var m=S_.m; if (m>=1440) return;
      var h=m/60, n=occ(h), Te=text(h), cs=consigne(h);
      var sol=(h>7&&h<18)?P.sol*Math.sin(Math.PI*(h-7)/11):0;
      /* l'ECS d'abord : puisage, boucle, et le ballon qui demande */
      var L=puisage(m), Leq=L*(40-10)/(S_.Tb-10);
      S_.Tb-=Leq*(S_.Tb-10)/VB;
      S_.Tb-=BOUCLE*60/(VB*4.185);
      S_.eau+=L;
      if (!S_.ecsOn && S_.Tb<55) S_.ecsOn=true;
      if (S_.ecsOn && S_.Tb>=60) S_.ecsOn=false;
      var qEcs=S_.ecsOn?PECS:0;
      /* la loi d'eau, et l'emission des radiateurs (implicite sur le retour) */
      var Tdc=Math.max(25,Math.min(85,cs+P.pente*(cs-Te)+P.para));
      var Tret=S_.Tret, Tdep=Tdc, em=0;
      for (var it=0;it<4;it++){
        var Tm=(Tdep+Tret)/2;
        em=PHIN*Math.pow(Math.max(0,(Tm-S_.Tz)/50),1.3);
        Tret=Tdep-em/(QM*4.185);
      }
      var qCh=Math.max(0,QM*4.185*(Tdep-Tret));
      /* la chaudiere : priorite ECS, modulation de 20 a 100 %, tout ou rien en dessous */
      var dispo=P.pch-qEcs, qChReel=Math.min(qCh,Math.max(0,dispo));
      var Tdep2=Tret+qChReel/(QM*4.185);
      if (qChReel<qCh){                        /* le chauffage n'a pas tout : le depart baisse */
        Tdep=Tdep2;
        for (var it2=0;it2<3;it2++){
          var Tm2=(Tdep+Tret)/2;
          em=PHIN*Math.pow(Math.max(0,(Tm2-S_.Tz)/50),1.3);
          Tret=Tdep-em/(QM*4.185);
        }
      }
      var qTot=qChReel+qEcs, seuil=0.2*P.pch, marche;
      if (qTot<=0) marche=false;
      else if (qTot>=seuil) marche=true;
      else {
        /* sous 20 % : la chaudiere ne module plus, elle bat au rythme de ses seuils */
        var cycleMin=Math.max(3,Math.round(60*seuil/Math.max(qTot,1)/4));
        marche=(m%cycleMin)<Math.max(1,Math.round(cycleMin*qTot/seuil));
      }
      if (marche&&!S_.dernierEtat) S_.cyc++;
      S_.dernierEtat=marche;
      var qBoiler=marche?Math.max(qTot,seuil):0;
      if (qTot>0&&qTot<seuil) qBoiler=marche?seuil:0;
      var TretCh=Tret+(P.bipasse/100)*(Tdep-Tret);
      var eta=rendement(TretCh);
      var condense=marche&&TretCh<57;
      /* le ballon se recharge */
      if (S_.ecsOn&&marche) S_.Tb+=PECS*60/(VB*4.185);
      /* le batiment */
      var gains=n*0.07+sol+UA*(Te-S_.Tz)+em;
      S_.Tz+=gains*60/CZ;
      S_.Tret=Tret;
      /* les comptes */
      var q={"Gaz PCI":qBoiler/eta,"Chauffage":marche?qChReel:0,"ECS":(S_.ecsOn&&marche)?PECS:0,
             "Boucle ECS":BOUCLE,"Fumées":qBoiler/eta-qBoiler,"Pompes":POMPES};
      for (var k in q) S_.E[k]+=q[k]/60;
      S_.q=q; S_.Tdep=Tdep; S_.Te=Te; S_.eta=eta; S_.marche=marche; S_.qBoiler=qBoiler;
      S_.cs=cs; S_.TretCh=TretCh;
      if (n>0){ S_.occmin++; if (S_.Tz<CONS-1.5) S_.hors++; }
      S_.trZ.push(S_.Tz); S_.trX.push(Te); S_.trD.push(marche?Tdep:(qChReel>0?(Tdep+Tret)/2:S_.Tz));
      S_.trR.push(Tret); S_.trB.push(S_.Tb); S_.cond.push(marche?(condense?2:1):0);
      S_.tmin=Math.min(S_.tmin,Te-2); S_.tmax=Math.max(S_.tmax,Tdep+4);
      S_.m++;
    }

    function px(m){return X0+(X1-X0)*m/1440;}
    function py(t){return Y1-(Y1-Y0)*(t-S_.tmin)/(S_.tmax-S_.tmin);}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle",
        "class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      for (var i=0;i<1440;i+=10) if (occ(i/60)>0)
        svg.appendChild(S("rect",{x:px(i),y:Y0,width:px(i+10)-px(i)+0.5,height:Y1-Y0,
          fill:V("tiede"),opacity:"0.10"}));
      [0,6,12,18,24].forEach(function(hh){
        svg.appendChild(S("line",{x1:px(hh*60),y1:Y0,x2:px(hh*60),y2:Y1,
          stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(hh*60),Y1+34,hh+" h");
      });
      [0,20,40,60,80].forEach(function(t){
        if (t<S_.tmin||t>S_.tmax) return;
        svg.appendChild(S("line",{x1:X0,y1:py(t),x2:X1,y2:py(t),stroke:V("trait2"),
          "stroke-width":"1",opacity:"0.4"}));
        txt(X0-8,py(t)+4,t+" °C","s-pet","end");
      });
      /* les puisages d'ECS, en tirets sur le haut */
      for (var i=0;i<1440;i+=3) if (puisage(i)>0)
        svg.appendChild(S("line",{x1:px(i),y1:Y0-8,x2:px(i),y2:Y0-2,stroke:V("violet"),"stroke-width":"1.2"}));
      txt(X0,Y0-12,"douches","s-pet","start","violet");
      function trace(arr,coul,ep,dash){
        if (arr.length<2) return;
        var pts=[];
        for (var i=0;i<arr.length;i++) pts.push(px(i).toFixed(1)+","+py(arr[i]).toFixed(1));
        var a={points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"};
        if (dash) a["stroke-dasharray"]=dash;
        svg.appendChild(S("polyline",a));
      }
      trace(S_.trX,"encre2",1.4,"5 4");
      trace(S_.trB,"violet",1.8);
      trace(S_.trR,"tiede",2);
      trace(S_.trD,"chaud",2.4);
      trace(S_.trZ,"froid",2.6);
      /* la chaudiere : rouge quand elle brule sans condenser, vert quand elle condense */
      var yb=Y1+8;
      for (var i=0;i<S_.cond.length;i++){
        if (!S_.cond[i]) continue;
        svg.appendChild(S("rect",{x:px(i),y:yb,width:Math.max(0.5,px(i+1)-px(i)),height:10,
          fill:V(S_.cond[i]===2?"vert":"chaud")}));
      }
      txt(X1+6,yb+9,"chaudière","s-pet","start");
      if (S_.m>0&&S_.m<1440)
        svg.appendChild(S("line",{x1:px(S_.m),y1:Y0,x2:px(S_.m),y2:Y1+18,stroke:V("encre"),"stroke-width":"1.6"}));
      var yl=Y1+50;
      [["froid","bâtiment"],["chaud","départ"],["tiede","retour"],["violet","ballon"]].forEach(function(l,i){
        var x=X0+i*94;
        svg.appendChild(S("line",{x1:x,y1:yl,x2:x+20,y2:yl,stroke:V(l[0]),"stroke-width":"3"}));
        txt(x+26,yl+4,l[1],"s-pet","start");
      });
      [["chaud","brûle sans condenser"],["vert","condense"]].forEach(function(l,i){
        var x=X0+i*188;
        svg.appendChild(S("rect",{x:x,y:yl+14,width:20,height:8,fill:V(l[0])}));
        txt(x+26,yl+22,l[1],"s-pet","start");
      });
      /* les postes */
      txt(XB,Y0-12,"LA JOURNÉE, EN kWh","s-tit","start");
      var mx=Math.max(3,S_.E["Gaz PCI"]);
      POSTES.forEach(function(p,i){
        var y=Y0+6+i*27, w=(XB1-XB-132)*S_.E[p]/mx;
        txt(XB,y+12,p,"s-pet","start");
        svg.appendChild(S("rect",{x:XB+86,y:y+2,width:Math.max(1,w),height:13,rx:"2",
          fill:V(i===0?"encre2":(i>=3?"chaud":"vert")),opacity:"0.8"}));
        txt(XB+90+w,y+13,frs(S_.E[p],1),"s-pet","start");
      });
      /* le compte rendu */
      var fini=S_.m>=1440, hh=Math.floor(S_.m/60), mm=S_.m%60;
      var utile=S_.E["Chauffage"]+S_.E["ECS"], gaz=S_.E["Gaz PCI"];
      var rj=gaz>0?100*utile/gaz:0;
      var partCond=S_.cond.length?100*S_.cond.filter(function(c){return c===2;}).length/
                   Math.max(1,S_.cond.filter(function(c){return c>0;}).length):0;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Heure</b><span>"+hh+" h "+(mm<10?"0":"")+mm+"</span></span>"+
        "<span><b>Bâtiment</b><span>"+frs(S_.Tz,1)+" °C</span></span>"+
        "<span><b>Consigne</b><span>"+frs(S_.cs!==undefined?S_.cs:consigne(0),1)+" °C</span></span>"+
        "<span><b>Extérieur</b><span>"+frs(S_.Te!==undefined?S_.Te:text(0),1)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Départ · retour</b><span>"+(S_.Tdep!==undefined?fr(S_.Tdep,0)+" · "+fr(S_.Tret,0)+" °C":"—")+"</span></span>"+
        "<span><b>Retour chaudière</b><span>"+(S_.TretCh!==undefined?fr(S_.TretCh,0)+" °C":"—")+"</span></span>"+
        "<span><b>Chaudière</b><span>"+(S_.marche?fr(100*S_.qBoiler/P.pch,0)+" %, "+(S_.TretCh<57?"condense":"ne condense pas"):"à l'arrêt")+"</span></span>"+
        "<span><b>Ballon</b><span>"+frs(S_.Tb,1)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Gaz</b><span>"+frs(gaz,1)+" kWh</span></span>"+
        "<span><b>Rendement du jour</b><span>"+(gaz>0?fr(rj,0)+" %":"—")+"</span></span>"+
        "<span><b>Temps en condensation</b><span>"+fr(partCond,0)+" %</span></span>"+
        "<span><b>Démarrages</b><span>"+S_.cyc+"</span></span>"+
        "<span><b>Hors confort, occupé</b><span>"+fr(S_.hors/60,1)+" h</span></span>"+
        "</div><p>"+(!S_.m
          ? "Appuyez sur <b>Lire</b>, ou avancez d'une heure. Le départ suit la loi d'eau ; "+
            "le retour dit si la chaudière condense."
          : fini
          ? "<b>Journée finie.</b> "+frs(gaz,0)+" kWh de gaz pour "+frs(utile,0)+
            " kWh utiles, rendement "+fr(rj,0)+" % sur PCI. La chaudière a condensé "+
            fr(partCond,0)+" % de son temps de marche"+
            (partCond<40?" : <b>regardez la température qui lui revient.</b>":".")+
            (S_.cyc>40?" <b>"+S_.cyc+" démarrages</b> : elle court-cycle, elle est trop grosse pour cette journée.":"")+
            (S_.hors>60?" Le bâtiment est resté <b>"+fr(S_.hors/60,1)+" h sous la consigne</b> en présence.":"")
          : "Le retour décide de tout : sous 57 °C la barre passe au vert et le gaz "+
            "rend plus que son PCI ; au-dessus, la chaudière brûle comme une "+
            "chaudière ordinaire.")+"</p>";
    }
    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.024; dernier=ts;
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.m<1440) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";return;}
      if (S_.m>=1440) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bHeure.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      if (S_.m>=1440) return;
      for (var i=0;i<60&&S_.m<1440;i++) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

/* ─────────── lire la chaufferie : six cadrans, une panne ─────────── */
var PANNES_CH=[
  {n:"Chaufferie saine", r:[0,66,48,19.5,1.6,58],
   lire:"Départ à la loi d'eau, retour 18 K plus bas, bâtiment à la consigne, pression "+
        "à froid dans la plage, ballon chaud. Rien à signaler."},
  {n:"Circulateur de chauffage arrêté", r:[0,68,66,15,1.6,58],
   lire:"Le départ et le retour se rejoignent : rien ne circule. L'eau stagne chaude "+
        "dans la chaudière et le bâtiment refroidit, alors que tout paraît chaud en "+
        "chaufferie."},
  {n:"Vanne trois voies bloquée côté retour", r:[0,34,31,14,1.6,58],
   lire:"Le départ est à peine plus chaud que le retour : la vanne ne prend plus d'eau "+
        "chaude. Le bâtiment refroidit, la chaudière chauffe pour rien."},
  {n:"Sonde extérieure au soleil", r:[8,46,36,17.5,1.6,58],
   lire:"La sonde lit 8 °C par 0 °C réel : la loi d'eau baisse le départ de 20 K, et "+
        "le bâtiment reste 1,5 K sous la consigne tout l'après-midi. Tout fonctionne, "+
        "sur une mesure fausse."},
  {n:"Circuit emboué", r:[0,66,30,16.5,1.6,58],
   lire:"Le débit s'effondre : l'eau met longtemps à traverser les radiateurs et revient "+
        "très froide. Grand écart et bâtiment froid, c'est le contraire d'une bonne "+
        "nouvelle."},
  {n:"Thermostatiques tous fermés", r:[0,66,33,21.5,1.6,58],
   lire:"Même grand écart, mais le bâtiment est chaud : les robinets ont fermé parce "+
        "qu'il y a des apports. Ce n'est pas une panne, c'est la loi d'eau qui est "+
        "trop haute."},
  {n:"Manque d'eau, chaudière en sécurité", r:[0,45,44,16,0.4,58],
   lire:"La pression est tombée sous le bar : le pressostat a coupé le brûleur. Départ "+
        "et retour se refroidissent ensemble, et le bâtiment suit."},
  {n:"Échangeur d'ECS entartré", r:[0,66,48,19.5,1.6,31],
   lire:"Le chauffage est parfait, mais le ballon ne remonte plus : l'échangeur ne passe "+
        "plus la puissance. Les douches du matin finissent froides."}
];

OUTILS["diagnostic-chaufferie"] = {
  titre:"Lire la chaufferie : six cadrans, une panne",
  intro:"Il fait 0 °C dehors. La sonde extérieure, le départ, le retour, l'ambiance, le "+
        "manomètre, le ballon : six lectures, et la panne est presque toujours dedans. "+
        "Choisissez-en une et regardez les aiguilles. Puis tirez-en une à l'aveugle, et trouvez.",
  monte:function(d){
    var P={panne:0, cache:-1, essais:0};
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Panne à observer"));
    var v=E("span",{"class":"v"},""); ch.appendChild(v);
    var sel=E("select",{},PANNES_CH.map(function(p,i){
      return '<option value="'+i+'"'+(i===0?" selected":"")+'>'+p.n+"</option>";}).join(""));
    sel.addEventListener("change",function(){P.panne=+this.value;calc();});
    ch.appendChild(sel); c1.appendChild(ch);
    var cmd=E("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"});
    var bTirer=E("button",{"class":"bt p",type:"button"},"Tirer une panne à l'aveugle");
    cmd.appendChild(bTirer); c2.appendChild(cmd);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);

    var W=680,H=330;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Six cadrans : sonde extérieure, départ, retour, ambiance, pression, ballon"});
    d.appendChild(svg);
    var choix=E("div",{"class":"qq",style:"display:none;border:0;padding:0"});
    choix.appendChild(E("p",{},"Quelle est la panne ?"));
    var choixL=E("div",{"class":"choix"}); choix.appendChild(choixL); d.appendChild(choix);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var CAD=[{n:"Sonde extérieure",u:"°C",lo:-10,hi:20,nlo:-2,nhi:2,dec:0},
             {n:"Départ",u:"°C",lo:20,hi:90,nlo:60,nhi:72,dec:0},
             {n:"Retour",u:"°C",lo:20,hi:90,nlo:42,nhi:54,dec:0},
             {n:"Ambiance",u:"°C",lo:12,hi:24,nlo:18.5,nhi:20.5,dec:1},
             {n:"Pression",u:"bar",lo:0,hi:3,nlo:1.2,nhi:2.2,dec:1},
             {n:"Ballon ECS",u:"°C",lo:20,hi:70,nlo:55,nhi:63,dec:0}];
    function cadran(cx,cy,r,c,val){
      function ang(x){var f=Math.min(1,Math.max(0,(x-c.lo)/(c.hi-c.lo)));return (-210+240*f)*Math.PI/180;}
      function pt(a,rr){return [cx+rr*Math.cos(a),cy+rr*Math.sin(a)];}
      function arc(a1,a2,rr,coul,ep,op){
        var p1=pt(a1,rr),p2=pt(a2,rr),gr=(a2-a1)>Math.PI?1:0;
        svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+rr+" "+rr+
          " 0 "+gr+" 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V(coul),
          "stroke-width":ep,"stroke-linecap":"round",opacity:op||1}));
      }
      arc(ang(c.lo),ang(c.hi),r,"trait2",6,0.7);
      arc(ang(c.nlo),ang(c.nhi),r,"vert",6,0.55);
      var a=ang(val), p=pt(a,r-5), hors=val<c.nlo||val>c.nhi;
      svg.appendChild(S("line",{x1:cx,y1:cy,x2:p[0].toFixed(1),y2:p[1].toFixed(1),
        stroke:V(hors?"chaud":"encre"),"stroke-width":"2.4","stroke-linecap":"round"}));
      svg.appendChild(S("circle",{cx:cx,cy:cy,r:"3.5",fill:V(hors?"chaud":"encre")}));
      svg.appendChild(S("text",{x:cx,y:cy+r-2,"text-anchor":"middle","class":"s-lab",
        fill:V(hors?"chaud":"encre")},frs(val,c.dec)+" "+c.u));
      svg.appendChild(S("text",{x:cx,y:cy+r+16,"text-anchor":"middle","class":"s-pet"},c.n));
    }
    function dessine(r){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      CAD.forEach(function(c,i){cadran(120+(i%3)*220,80+Math.floor(i/3)*160,52,c,r[i]);});
      var dt=r[1]-r[2];
      svg.appendChild(S("text",{x:W-14,y:16,"text-anchor":"end","class":"s-lab",
        fill:V(dt<8||dt>26?"chaud":"encre")},"écart départ-retour : "+fr(dt,0)+" K"));
    }
    function calc(){
      choix.style.display="none";
      v.textContent=P.panne===0?"référence":"observée";
      dessine(PANNES_CH[P.panne].r);
      res.innerHTML="<p><b>"+PANNES_CH[P.panne].n+".</b> "+PANNES_CH[P.panne].lire+"</p>";
    }
    function aveugle(){
      P.essais=0;
      P.cache=Math.random()<0.14?0:1+Math.floor(Math.random()*(PANNES_CH.length-1));
      sel.value="0"; v.textContent="à trouver";
      dessine(PANNES_CH[P.cache].r);
      choixL.innerHTML="";
      PANNES_CH.forEach(function(p,i){
        var b=E("button",{type:"button"},p.n);
        b.addEventListener("click",function(){juger(i,b);});
        choixL.appendChild(b);
      });
      choix.style.display="block";
      res.innerHTML="<p>Lisez l'<b>écart départ-retour</b> d'abord : nul, rien ne circule ; "+
        "énorme, le débit manque. Puis l'ambiance dit si le bâtiment s'en plaint, et le "+
        "manomètre ou le ballon désignent ce qui n'est pas le chauffage.</p>";
    }
    function juger(i,b){
      P.essais++;
      var L=PANNES_CH[P.cache].r, G=PANNES_CH[i].r;
      if (i===P.cache){
        b.className="juste";
        [].slice.call(choixL.children).forEach(function(x){x.disabled=true;});
        res.innerHTML="<p><b>Juste</b>, en "+P.essais+" essai"+(P.essais>1?"s":"")+". "+PANNES_CH[i].lire+"</p>";
        return;
      }
      b.className="faux"; b.disabled=true;
      var k=-1, ecart=0;
      for (var j=0;j<6;j++){ var e=Math.abs(L[j]-G[j])/(CAD[j].hi-CAD[j].lo); if (e>ecart){ecart=e;k=j;} }
      res.innerHTML="<p><b>Non.</b> Avec cette panne, le cadran « "+CAD[k].n+" » serait "+
        (L[k]>G[k]?"plus bas":"plus haut")+" que ce que vous lisez. Reprenez par l'écart "+
        "départ-retour, puis par l'aiguille qui sort le plus de sa zone verte.</p>";
    }
    bTirer.addEventListener("click",aveugle);
    calc();
  }
};

/* ─────────── l'embleme d'en-tete : la journee de la chaufferie ─────────── */
SCHEMAS["chaufferie-embleme"]=function(el){
  var W=300,H=250, cx=150, cy=128, R=92;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un cadran de vingt-quatre heures : la relance, la journée d'école, le réduit de nuit, et le départ qui suit"});
  el.appendChild(svg);
  function pt(h,r){var a=(h/24*360-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
  svg.appendChild(S("circle",{cx:cx,cy:cy,r:R,fill:"none",stroke:V("encre"),"stroke-width":"2.2"}));
  for (var h=0;h<24;h++){
    var a=pt(h,R), b=pt(h,R-(h%6?6:12));
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("encre"),"stroke-width":h%6?"1.2":"2.2"}));
  }
  [[8,12],[14,17]].forEach(function(o){
    var p1=pt(o[0],R+9), p2=pt(o[1],R+9);
    svg.appendChild(S("path",{d:"M "+p1[0].toFixed(1)+" "+p1[1].toFixed(1)+" A "+(R+9)+" "+(R+9)+
      " 0 0 1 "+p2[0].toFixed(1)+" "+p2[1].toFixed(1),fill:"none",stroke:V("tiede"),
      "stroke-width":"6","stroke-linecap":"round"}));
  });
  function courbe(f,coul,ep){
    var pts=[];
    for (var i=0;i<=96;i++){var t=i/4,q=pt(t,f(t));pts.push(q[0].toFixed(1)+","+q[1].toFixed(1));}
    svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linejoin":"round"}));
  }
  /* le depart, haut le jour, bas la nuit ; le batiment, qui suit en plus doux */
  courbe(function(t){return R-30+((t>5&&t<22)?12:0)*Math.min(1,(t>5?(t-5):0)/1.5)-3*Math.sin(t*2);},"chaud",2.4);
  courbe(function(t){return R-62+((t>6&&t<23)?7:0)*Math.min(1,(t>6?(t-6):0)/2.5);},"froid",2.4);
  svg.appendChild(S("text",{x:cx,y:cy+6,"text-anchor":"middle","class":"s-tit",fill:V("encre2")},"24 h"));
  svg.appendChild(S("text",{x:cx,y:cy-R-16,"text-anchor":"middle","class":"s-pet"},"0 h"));
  svg.appendChild(S("text",{x:cx,y:cy+R+26,"text-anchor":"middle","class":"s-pet"},"12 h"));
};

/* ═══════════════════════════════════════════ LE PRODUCTIBLE PHOTOVOLTAIQUE
   Seance 22. Quatre nombres suffisent a un productible, trois de plus a ce
   qu'il vaut : la puissance crete, l'irradiation du plan, le ratio de
   performance, puis la consommation, la part autoconsommee et les deux prix.
   L'outil ne connait pas la courbe horaire : la part autoconsommee est un
   curseur, et c'est voulu — c'est elle que le cours discute. */


/* ═══════════════════════════════════════════ ÉCLAIRER UNE SALLE
   Seance 23. La methode du facteur d'utilisation, telle qu'elle se fait a
   la main : le flux a installer, le nombre de luminaires, la puissance au
   metre carre, et ce que la gestion en retire sur l'annee. */


/* ═══════════════════════════════════════════ DIX MINUTES, CHRONO
   Les automatismes se travaillent en temps limite : c'est la contrainte qui
   fait l'automatisme, pas la difficulte. Le decompte est celui de la classe —
   dix minutes en debut d'heure —, et il se lit de loin pour pouvoir etre
   projete. Rien n'est enregistre : fermer l'onglet remet tout a zero. */


/* ═══════════════════════════════════════════ QUINZE MINUTES DE LECTURE
   Fiche FICHE-LECTURE-DOSSIER. L'epreuve commence par quinze a vingt
   minutes de lecture, et 40 % de ses points sont de l'extraction. Le jeu
   entraine le geste sans le contenu : trois dossiers fictifs, un groupe
   scolaire, une piscine, un immeuble de bureaux, douze consignes chacun, et
   pour chaque consigne deux choix, OU chercher, et QUELLE FORME de reponse
   le verbe demande. Le chronometre tourne. Le retour dit juste ou faux et
   rappelle la methode ; il ne donne jamais de reponse de fond, il n'y en a
   pas. Un menu choisit le dossier, « au hasard » en premier : le hasard
   empeche de refaire toujours le meme, le menu permet d'en imposer un en
   classe. */
var FORMES_LECTURE = [
  "un mot, ou une valeur avec son unité",
  "trois lignes : la donnée, la règle, la conclusion",
  "l'ordre des étapes, numérotées",
  "la formule, les valeurs, le résultat souligné avec son unité",
  "sur le document réponse, au crayon"
];
/* chaque consigne : [texte, document, forme, ce que rappelle le retour] */
var DOSSIERS_LECTURE = [
 {nom:"Groupe scolaire",
  titre:"Groupe scolaire des Terrasses, extension et rénovation énergétique",
  docs:[
    ["DT 1","Présentation du projet, plan de masse, sources d'énergie"],
    ["DT 2","Schéma de principe de la chaufferie, régimes d'eau"],
    ["DT 3","Fiche technique de la chaudière à condensation"],
    ["DT 4","Schéma de la CTA de la salle polyvalente, occupation, débits"],
    ["DT 5","Diagramme de l'air humide"],
    ["DT 6","Extrait de catalogue : sondes de CO₂"],
    ["DT 7","Tableau de points et programme horaire de la GTB"],
    ["DT 8","Index des compteurs et facture annuelle"],
    ["DR 1","Schéma hydraulique à surligner"],
    ["DR 2","Graphe de régulation de la batterie chaude à compléter"]
  ],
  questions:[
    ["Indiquer la puissance nominale de la chaudière et son rendement sur PCI.",2,0,
     "« Indiquer » et une fiche technique : on relève, on n'explique pas."],
    ["Justifier le choix d'une chaudière à condensation au regard du régime d'eau des radiateurs.",1,1,
     "Le régime d'eau est sur le schéma de principe ; « justifier » demande la donnée, la règle et la conclusion."],
    ["Surligner le circuit primaire sur le schéma hydraulique.",8,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Déterminer le débit d'air neuf de la salle polyvalente pour l'occupation prévue.",3,3,
     "L'occupation est une donnée du schéma de la CTA ; « déterminer » est un calcul, avec l'unité."],
    ["Placer le point de soufflage sur le diagramme et lire sa teneur en eau.",4,4,
     "Un point se place sur le diagramme fourni, qui est un document réponse de fait."],
    ["Expliquer pourquoi la sonde de CO₂ est installée sur la reprise et non sur le soufflage.",3,1,
     "« Expliquer » : trois lignes, et la donnée est la position de la sonde sur le schéma de la CTA."],
    ["Choisir la sonde de CO₂ adaptée et relever sa plage de mesure et son signal de sortie.",5,0,
     "Un extrait de catalogue se lit ; « relever » donne des valeurs, pas des phrases."],
    ["Compléter le tableau de points : la nature de chaque point de la CTA.",6,4,
     "Un tableau à compléter est un document réponse, même s'il est dans un DT."],
    ["Calculer la consommation de chauffage de l'année à partir des index.",7,3,
     "Deux index, une différence, une unité : c'est un calcul, et il s'écrit."],
    ["Compléter le graphe de régulation de la batterie chaude avec les valeurs manquantes.",9,4,
     "Un graphe se complète sur le DR, au crayon d'abord."],
    ["Décrire, dans l'ordre, ce que fait la GTB à la relance de 6 h.",6,2,
     "« Décrire » demande un ordre ; le programme horaire est dans le tableau de points de la GTB."],
    ["Citer les deux sources d'énergie du groupe scolaire.",0,0,
     "« Citer » : deux mots, pris dans la présentation du projet."]
  ]},
 {nom:"Piscine",
  titre:"Centre aquatique des Oliviers, construction neuve",
  docs:[
    ["DT 1","Présentation du centre : bassins, fréquentation, températures, énergies"],
    ["DT 2","Schéma de principe de la chaufferie et de la PAC sur air extrait"],
    ["DT 3","Schéma de la CTA de déshumidification du hall, points de fonctionnement"],
    ["DT 4","Diagramme de l'air humide"],
    ["DT 5","Schéma de l'ECS avec récupérateur sur eaux grises"],
    ["DT 6","Extrait de catalogue : vannes trois voies et servomoteurs"],
    ["DT 7","Programme de régulation des deux batteries chaudes"],
    ["DT 8","Consommations mensuelles d'eau et d'énergie, fréquentation"],
    ["DR 1","Schéma de l'ECS à surligner"],
    ["DR 2","Graphe de régulation des deux vannes à compléter"]
  ],
  questions:[
    ["Indiquer la température de l'eau des bassins et celle de l'air du hall.",0,0,
     "« Indiquer » : deux valeurs relevées dans la présentation, avec leur unité."],
    ["Expliquer pourquoi l'air du hall est maintenu deux degrés au-dessus de l'eau des bassins.",0,1,
     "Les deux températures sont dans la présentation ; la règle est l'évaporation des bassins, et « expliquer » veut trois lignes."],
    ["Citer les deux générateurs de la chaufferie.",1,0,
     "« Citer » : deux noms, lus sur le schéma de principe."],
    ["Justifier le choix d'une PAC sur air extrait plutôt qu'un rejet direct de l'air du hall.",1,1,
     "La PAC figure sur le schéma de la chaufferie ; « justifier » demande la donnée, la règle et la conclusion."],
    ["Déterminer la puissance de la batterie froide à partir des enthalpies d'entrée et de sortie.",2,3,
     "Les points de fonctionnement sont sur le schéma de la CTA ; « déterminer » est un calcul, qm × Δh, avec l'unité."],
    ["Placer le point de l'air du hall sur le diagramme et lire son humidité absolue.",3,4,
     "Un point se place sur le diagramme fourni, qui est un document réponse de fait."],
    ["Expliquer l'intérêt du récupérateur sur eaux grises.",4,1,
     "Le récupérateur est sur le schéma de l'ECS ; trois lignes, la donnée, la règle, la conclusion."],
    ["Surligner le parcours de l'eau froide sanitaire, du compteur au ballon, à travers le récupérateur.",8,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Relever le signal de commande et le temps de course du servomoteur retenu.",5,0,
     "Un extrait de catalogue se lit ; « relever » donne des valeurs, pas des phrases."],
    ["Décrire, dans l'ordre, l'enclenchement des deux batteries chaudes quand la température de soufflage baisse.",6,2,
     "« Décrire » demande un ordre ; il est dans le programme de régulation."],
    ["Compléter le graphe de régulation des deux vannes en séquence.",9,4,
     "Un graphe se complète sur le DR, au crayon d'abord."],
    ["Calculer la consommation d'eau par baigneur au mois de juillet.",7,3,
     "La consommation et la fréquentation sont dans le même tableau ; une division, avec son unité."]
  ]},
 {nom:"Immeuble de bureaux",
  titre:"Immeuble Le Belvédère, rénovation lourde de bureaux",
  docs:[
    ["DT 1","Présentation du projet : surfaces, effectif, calendrier des travaux"],
    ["DT 2","Coupe de la façade avant et après isolation par l'extérieur"],
    ["DT 3","Fiches techniques des isolants : conductivité, épaisseur, prix"],
    ["DT 4","Schéma de principe de la sous-station de chauffage urbain"],
    ["DT 5","Contrat de réseau de chaleur : abonnement et prix du kWh"],
    ["DT 6","Implantation des modules photovoltaïques en toiture"],
    ["DT 7","Synoptique de raccordement du photovoltaïque au TGBT"],
    ["DT 8","Index des compteurs de production, d'injection et de soutirage"],
    ["DR 1","Tableau de calcul du coefficient U de la façade"],
    ["DR 2","Synoptique du raccordement à surligner"]
  ],
  questions:[
    ["Indiquer la surface de plancher et l'effectif du bâtiment.",0,0,
     "« Indiquer » : deux valeurs de la présentation, avec leur unité."],
    ["Calculer la résistance thermique du nouvel isolant, à partir de son épaisseur et de sa conductivité.",2,3,
     "L'épaisseur et la conductivité sont sur la fiche de l'isolant ; R = e / λ, avec l'unité."],
    ["Compléter le tableau de calcul du coefficient U de la façade isolée.",8,4,
     "Un tableau à compléter est un document réponse."],
    ["Expliquer pourquoi l'isolation par l'extérieur supprime le pont thermique du plancher.",1,1,
     "La coupe avant et après montre le plancher ; trois lignes, la donnée, la règle, la conclusion."],
    ["Nommer les éléments repérés 1 à 4 sur la sous-station.",3,0,
     "« Nommer » : un mot par repère, lu sur le schéma de principe."],
    ["Décrire le parcours de l'eau du réseau primaire, de l'arrivée au retour.",3,2,
     "« Décrire » demande un ordre ; on suit le schéma dans le sens de l'eau."],
    ["Calculer la part fixe annuelle de la facture de chaleur.",4,3,
     "L'abonnement est dans le contrat ; une multiplication par la puissance souscrite, avec l'unité."],
    ["Relever la puissance crête installée et le nombre d'onduleurs.",5,0,
     "« Relever » : deux valeurs, lues sur l'implantation en toiture."],
    ["Justifier l'orientation est-ouest retenue pour les modules.",5,1,
     "L'orientation est sur l'implantation ; la règle est la forme de la courbe de production sur la journée."],
    ["Expliquer pourquoi l'onduleur s'arrête lors d'une coupure du réseau.",6,1,
     "Le synoptique montre la protection de découplage ; trois lignes, la donnée, la règle, la conclusion."],
    ["Surligner le parcours de l'énergie produite quand la production dépasse la consommation.",9,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Calculer le taux d'autoconsommation du mois de mai à partir des index.",7,3,
     "Trois index, deux différences, un quotient : c'est un calcul, et il s'écrit."]
  ]}
];

OUTILS["lecture-dossier"] = {
  titre:"Quinze minutes de lecture : où chercher, et sous quelle forme répondre",
  intro:"Un dossier fictif, douze consignes. Pour chacune, dites dans quel "+
        "document se trouve la réponse, et quelle forme le verbe de consigne "+
        "attend. Le chronomètre tourne : l'épreuve donne quinze minutes.",
  monte:function(d){
    var D=null, debut=null, fini=false, tick=null;
    var ch=E("div",{"class":"champ"});
    ch.appendChild(E("label",{},"Le dossier"));
    var vD=E("span",{"class":"v"},""); ch.appendChild(vD);
    var selD0=E("select",{},'<option value="-1">Au hasard</option>'+DOSSIERS_LECTURE.map(function(x,i){
      return '<option value="'+i+'">'+x.nom+"</option>";}).join(""));
    ch.appendChild(selD0); d.appendChild(ch);
    var tete=E("div",{"class":"res"}); d.appendChild(tete);
    function afficheTete(){
      var i=+selD0.value;
      if (i<0 && !D){
        vD.textContent="tiré au sort au départ";
        tete.innerHTML="<p>Le dossier sera <b>tiré au sort</b> quand vous appuierez sur Commencer : "+
          DOSSIERS_LECTURE.map(function(x){return x.nom.toLowerCase();}).join(", ")+".</p>";
        return;
      }
      var X=D||DOSSIERS_LECTURE[i];
      vD.textContent=X.nom.toLowerCase();
      tete.innerHTML="<p><b>"+X.titre+"</b> · les documents du dossier :</p>"+
        "<ul style='columns:2;margin:6px 0 0;padding-left:18px'>"+X.docs.map(function(x){
          return "<li><b>"+x[0]+"</b> · "+x[1]+"</li>";}).join("")+"</ul>";
    }
    selD0.addEventListener("change",function(){ if (!debut||fini){ D=null; afficheTete(); } });
    var cmd=E("div",{style:"display:flex;gap:8px;margin:12px 0;flex-wrap:wrap;align-items:center"});
    var bGo=E("button",{"class":"bt p",type:"button"},"Commencer");
    var bVer=E("button",{"class":"bt",type:"button",disabled:"disabled"},"Vérifier");
    var chrono=E("span",{"class":"s-lab",style:"font-family:'IBM Plex Mono',monospace;font-size:15px"},"00:00");
    cmd.appendChild(bGo); cmd.appendChild(bVer); cmd.appendChild(chrono); d.appendChild(cmd);
    var liste=E("div",{style:"display:none"}); d.appendChild(liste);
    var res=E("div",{"class":"res",style:"margin-top:12px;display:none"}); d.appendChild(res);
    var ordre=[], selDoc=[], selF=[], lignes=[];
    function construit(){
      liste.innerHTML=""; selDoc=[]; selF=[]; lignes=[];
      ordre=D.questions.map(function(q,i){return i;});
      for (var i=ordre.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=ordre[i];ordre[i]=ordre[j];ordre[j]=t;}
      ordre.forEach(function(qi,k){
        var q=D.questions[qi];
        var bloc=E("div",{"class":"champ",style:"margin:10px 0;padding:10px 12px;border:1px solid var(--trait);border-radius:8px"});
        bloc.appendChild(E("p",{style:"margin:0 0 8px"},"<b>"+(k+1)+".</b> "+q[0]));
        var g=E("div",{style:"display:flex;gap:10px;flex-wrap:wrap"});
        var s1=E("select",{},"<option value=''>Où chercher ?</option>"+D.docs.map(function(x,i){
          return "<option value='"+i+"'>"+x[0]+" · "+x[1]+"</option>";}).join(""));
        var s2=E("select",{},"<option value=''>Quelle forme de réponse ?</option>"+FORMES_LECTURE.map(function(x,i){
          return "<option value='"+i+"'>"+x+"</option>";}).join(""));
        g.appendChild(s1); g.appendChild(s2); bloc.appendChild(g);
        var retour=E("p",{style:"margin:8px 0 0;display:none"}); bloc.appendChild(retour);
        liste.appendChild(bloc); selDoc.push(s1); selF.push(s2); lignes.push(retour);
      });
    }
    function affiche(){
      if (!debut) return;
      var s=Math.floor((Date.now()-debut)/1000), m=Math.floor(s/60); s=s%60;
      chrono.textContent=(m<10?"0":"")+m+":"+(s<10?"0":"")+s+(m>=15?"  · au-delà des quinze minutes":"");
      chrono.style.color=m>=15?V("chaud"):V("encre");
    }
    bGo.addEventListener("click",function(){
      var i=+selD0.value;
      D=DOSSIERS_LECTURE[i<0?Math.floor(Math.random()*DOSSIERS_LECTURE.length):i];
      afficheTete();
      construit(); liste.style.display="block"; res.style.display="none";
      fini=false; debut=Date.now(); bVer.disabled=false; bGo.textContent="Recommencer";
      if (tick) clearInterval(tick); tick=setInterval(affiche,500); affiche();
    });
    bVer.addEventListener("click",function(){
      if (fini||!D) return;
      fini=true; clearInterval(tick); affiche();
      var nd=0, nf=0, vides=0;
      ordre.forEach(function(qi,k){
        var q=D.questions[qi], vd=selDoc[k].value, vf=selF[k].value;
        if (vd===""&&vf==="") vides++;
        var okd=(vd!==""&&+vd===q[1]), okf=(vf!==""&&+vf===q[2]);
        if (okd) nd++; if (okf) nf++;
        selDoc[k].disabled=true; selF[k].disabled=true;
        var r=lignes[k]; r.style.display="block";
        r.innerHTML=(okd?"<span style='color:"+V("vert")+"'><b>Document :</b> juste.</span> ":"<span style='color:"+V("chaud")+"'><b>Document :</b> non, c'était le "+D.docs[q[1]][0]+".</span> ")+
                    (okf?"<span style='color:"+V("vert")+"'><b>Forme :</b> juste.</span> ":"<span style='color:"+V("chaud")+"'><b>Forme :</b> non, "+FORMES_LECTURE[q[2]]+".</span> ")+
                    "<span style='color:var(--encre2)'>"+q[3]+"</span>";
      });
      var s=Math.floor((Date.now()-debut)/1000), m=Math.floor(s/60);
      res.style.display="block";
      res.innerHTML="<div class='gros'>"+
        "<span><b>Dossier</b><span>"+D.nom+"</span></span>"+
        "<span><b>Documents trouvés</b><span>"+nd+" / "+ordre.length+"</span></span>"+
        "<span><b>Formes justes</b><span>"+nf+" / "+ordre.length+"</span></span>"+
        "<span><b>Temps</b><span>"+m+" min "+(s%60)+" s</span></span>"+
        "<span><b>Sans réponse</b><span>"+vides+"</span></span></div>"+
        "<p>"+(m>=15?"<b>Plus de quinze minutes :</b> à l'épreuve, ce temps est pris sur la première partie. ":"<b>Dans les quinze minutes.</b> ")+
        (nd<ordre.length-2?"Plusieurs documents ratés : relisez le sommaire des DT avant les questions, c'est la règle 1 de la lecture. ":"")+
        (nf<ordre.length-2?"Plusieurs formes ratées : le verbe de la consigne dit ce que le correcteur attend, relisez le tableau des verbes de la séance 25. ":"")+
        "Changez de dossier pour vérifier que le geste tient sur un autre bâtiment.</p>";
      res.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
    afficheTete();
  }
};

/* ═══════════════════════════════════════════ LA CARTE DES PREREQUIS
   Page d'essai. Le site ecrit prerequis.js, la carte des pages publiees et
   des pages que chacune suppose lues. L'outil la dessine en colonnes, une par
   sequence, et la croise avec les marques « lu » du navigateur : on choisit
   la page qu'on va lire, et la carte dit ce qu'il faut avoir lu avant, et ce
   qui ne l'est pas encore. Tout reste dans le navigateur, rien ne sort. */
OUTILS["carte-prerequis"] = {
  titre:"Ce qu'il faut avoir lu avant : la carte des prérequis",
  intro:"Chaque page du site annonce ses prérequis. Mises bout à bout, elles font "+
        "une carte. Choisissez la page que vous allez lire : ses prérequis "+
        "s'allument, et ceux que vous n'avez pas encore marqués « lu » sont en rouge.",
  monte:function(d){
    var socle=document.querySelector("[data-site]");
    var res=E("div",{"class":"res"});
    if (!socle){
      res.innerHTML="<p>La carte ne vit que sur le site de classe : elle lit la liste des pages publiées, que seule la construction du site connaît.</p>";
      d.appendChild(res); return;
    }
    var CLE="fed."+socle.getAttribute("data-site")+".lu";
    function lues(){ try{ return JSON.parse(localStorage.getItem(CLE)||"{}")||{}; }catch(e){ return {}; } }
    var sc=document.createElement("script");
    sc.src="../prerequis.js";
    sc.onload=function(){ dessine(window.PREREQUIS||{}); };
    sc.onerror=function(){ res.innerHTML="<p>La carte n'a pas pu être chargée : reconstruire le site.</p>"; d.appendChild(res); };
    document.head.appendChild(sc);

    function dessine(C){
      var ids=Object.keys(C);
      if (!ids.length){ res.innerHTML="<p>Aucune page publiée ne déclare de prérequis.</p>"; d.appendChild(res); return; }
      /* les colonnes : un groupe par sequence, puis le reste dans l'ordre d'apparition */
      var groupes=[], parG={};
      ids.forEach(function(id){
        var g=C[id].groupe; if (!parG[g]){ parG[g]=[]; groupes.push(g); }
        parG[g].push(id);
      });
      groupes.sort(function(a,b){
        var sa=/^Séquence (\d+)/.exec(a), sb=/^Séquence (\d+)/.exec(b);
        if (sa&&sb) return +sa[1]-+sb[1];
        if (sa) return -1; if (sb) return 1; return 0;
      });
      groupes.forEach(function(g){ parG[g].sort(function(a,b){ return (C[a].ordre-C[b].ordre)||(a<b?-1:1); }); });
      var CW=150, RH=54, X0=20, Y0=54, nmax=0;
      groupes.forEach(function(g){ nmax=Math.max(nmax,parG[g].length); });
      var W=X0*2+groupes.length*CW, H=Y0+nmax*RH+20;
      var pos={};
      groupes.forEach(function(g,ci){ parG[g].forEach(function(id,ri){ pos[id]={x:X0+ci*CW+CW/2,y:Y0+ri*RH+RH/2}; }); });
      /* la page qu'on va lire : par defaut la premiere non lue dans l'ordre des colonnes */
      var lu=lues(), choix=null;
      for (var i=0;i<groupes.length&&!choix;i++) for (var j=0;j<parG[groupes[i]].length;j++){ var id=parG[groupes[i]][j]; if(!lu[id]){ choix=id; break; } }
      if (!choix) choix=ids[0];
      var ch=E("div",{"class":"champ"}); ch.appendChild(E("label",{},"La page que je vais lire"));
      var vS=E("span",{"class":"v"},""); ch.appendChild(vS);
      var sel=E("select",{},groupes.map(function(g){ return parG[g].map(function(id){ return "<option value='"+id+"'"+(id===choix?" selected":"")+">"+C[id].nom+"</option>"; }).join(""); }).join(""));
      ch.appendChild(sel); d.appendChild(ch);
      var enveloppe=E("div",{style:"overflow-x:auto;margin-top:8px"}); d.appendChild(enveloppe);
      var svg=S("svg",{viewBox:"0 0 "+W+" "+H,width:W,role:"img","aria-label":"Carte des pages du site et de leurs prérequis"});
      svg.style.minWidth=W+"px"; enveloppe.appendChild(svg);
      d.appendChild(res);
      function amont(id,acc){ (C[id].pre||[]).forEach(function(p){ if(!acc[p[0]]){ acc[p[0]]=p[1]; amont(p[0],acc); } }); return acc; }
      function peint(){
        lu=lues(); choix=sel.value; vS.textContent=lu[choix]?"déjà lue":"à lire";
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var directs={}; (C[choix].pre||[]).forEach(function(p){ directs[p[0]]=p[1]; });
        var tous=amont(choix,{});
        groupes.forEach(function(g,ci){
          svg.appendChild(S("text",{x:X0+ci*CW+CW/2,y:26,"text-anchor":"middle","class":"s-lab",fill:V("encre2")},g));
        });
        /* les liaisons : de la page prerequise vers la page qui la suppose */
        ids.forEach(function(id){ (C[id].pre||[]).forEach(function(p){
          var a=pos[p[0]], b=pos[id]; if(!a||!b) return;
          var fort=(id===choix), amontChoix=(tous[id]!==undefined&&tous[p[0]]!==undefined);
          var coul=fort?(lu[p[0]]?"vert":"chaud"):(amontChoix?"tiede":"trait2");
          var dx=(b.x-a.x)/2;
          svg.appendChild(S("path",{d:"M"+a.x+","+a.y+" C"+(a.x+dx)+","+a.y+" "+(b.x-dx)+","+b.y+" "+b.x+","+b.y,
            fill:"none",stroke:V(coul),"stroke-width":fort?3:(amontChoix?2:1),opacity:fort?1:(amontChoix?0.9:0.35)}));
        }); });
        ids.forEach(function(id){
          var p=pos[id], estChoix=(id===choix), direct=directs[id]!==undefined, loin=tous[id]!==undefined;
          var fond=estChoix?"encre":(direct?(lu[id]?"vert":"chaud"):(loin?"tiede":(lu[id]?"vert":"carte")));
          var g=S("g",{style:"cursor:pointer"});
          g.appendChild(S("rect",{x:p.x-64,y:p.y-18,width:128,height:36,rx:"8",fill:V(fond),opacity:estChoix||direct||loin?1:(lu[id]?0.55:1),stroke:V(lu[id]?"vert":"trait"),"stroke-width":lu[id]?2:1}));
          var nom=C[id].code||C[id].nom.split(" — ")[0].split(" · ")[0];
          if (nom.length>16) nom=nom.slice(0,15)+"…";
          g.appendChild(S("text",{x:p.x,y:p.y+5,"text-anchor":"middle","class":"s-pet",fill:V(estChoix||direct||loin?"carte":"encre")},nom));
          g.addEventListener("click",function(){ sel.value=id; peint(); });
          svg.appendChild(g);
        });
        /* le compte rendu : la liste des prerequis, lus ou non, avec le lien */
        var manque=[], ok=[];
        (C[choix].pre||[]).forEach(function(p){ (lu[p[0]]?ok:manque).push(p); });
        var h="<p><b>"+C[choix].nom+"</b> suppose "+(C[choix].pre||[]).length+" page"+((C[choix].pre||[]).length>1?"s":"")+" lue"+((C[choix].pre||[]).length>1?"s":"")+".</p>";
        if (manque.length) h+="<p><b>À lire avant, pas encore marqué « lu » :</b></p><ul>"+manque.map(function(p){ return "<li><a href='../"+p[0]+".html'>"+C[p[0]].nom+"</a> — "+p[1]+"</li>"; }).join("")+"</ul>";
        if (ok.length) h+="<p><b>Déjà lu :</b> "+ok.map(function(p){ return C[p[0]].nom; }).join(" · ")+"</p>";
        if (!(C[choix].pre||[]).length) h+="<p>Cette page ne suppose rien : on peut commencer par elle.</p>";
        var loinL=Object.keys(tous).filter(function(id){ return !directs[id]&&!lu[id]; });
        if (loinL.length) h+="<p style='color:var(--encre2)'>Plus en amont, non lus : "+loinL.map(function(id){ return C[id].nom; }).join(" · ")+".</p>";
        h+="<p style='color:var(--encre2)'>Les marques « lu » sont celles de ce navigateur, sur cet appareil ; personne d'autre ne les voit.</p>";
        res.innerHTML=h;
      }
      sel.addEventListener("change",peint);
      window.addEventListener("storage",peint);
      peint();
    }
  }
};

/* ═══════════════════════════════════════════ UNE SAISON DE POMPE A CHALEUR
   Page d'essai. Une journee ne dit rien d'une pompe a chaleur : son COP
   change avec l'exterieur et avec la temperature qu'on lui demande, sa
   puissance tombe quand il fait froid, et l'appoint prend le relais sous le
   point de bivalence. Il faut une saison, jour par jour, du 1er octobre au
   30 avril. Le batiment est celui du fil rouge : G kW/K, une consigne, des
   apports gratuits qui valent 3 K. La PAC est definie a +7/35 et suit une loi
   simple : la puissance perd 3 % par kelvin sous +7, le COP vaut la moitie de
   Carnot avec un givrage entre -3 et +5 °C. */
var CLIMATS = {
  "Fréjus":     {tm:[17,12,9,8,9,11,14],  base:-5,  amp:7},
  "Lyon":       {tm:[13,7,4,3,4,8,11],    base:-10, amp:9},
  "Lille":      {tm:[12,7,4,3,4,7,10],    base:-9,  amp:8},
  "Strasbourg": {tm:[11,5,2,1,2,6,10],    base:-15, amp:10}
};
var NOMS_CLIMATS = ["Fréjus","Lyon","Lille","Strasbourg"];
var EMETTEURS = {
  "Plancher chauffant 35/28":  {tbase:35, pente:0.67},
  "Radiateurs basse T 55/45":  {tbase:55, pente:1.5},
  "Radiateurs existants 65/55":{tbase:65, pente:1.9}
};
var NOMS_EMETTEURS = ["Plancher chauffant 35/28","Radiateurs basse T 55/45","Radiateurs existants 65/55"];
var MOIS_SAISON = ["oct.","nov.","déc.","janv.","févr.","mars","avr."];
var JOURS_MOIS = [31,30,31,31,28,31,30];

OUTILS["saison-pac"] = {
  titre:"Une saison de pompe à chaleur, jour par jour",
  intro:"Appuyez sur Lire : du 1er octobre au 30 avril, la PAC seule en automne, "+
        "l'appoint sous le point de bivalence en janvier, le COP qui remonte en "+
        "mars. Le SCOP est ce qui reste à la fin.",
  monte:function(d){
    var DEF={climat:"Fréjus", G:3, part:50, emet:"Radiateurs basse T 55/45", appoint:"électrique", mode:"parallèle", pe:25, pg:10};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Fréjus, radiateurs 55/45, PAC à 50 % de la base", {}],
      ["2 · La même PAC à Lille", {climat:"Lille"}],
      ["3 · Plancher chauffant", {emet:"Plancher chauffant 35/28"}],
      ["4 · Radiateurs existants 65/55", {emet:"Radiateurs existants 65/55"}],
      ["5 · PAC dimensionnée à 100 % de la base", {part:100}],
      ["6 · Appoint gaz en alternatif", {appoint:"gaz", mode:"alternatif"}],
      ["7 · PAC trop petite, 35 % de la base", {part:35}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Scénario du cours"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===1?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} reset(); }
    maj.push(choixListe(c1,P,"climat",NOMS_CLIMATS,"Climat",touche,
      function(n){return "base "+CLIMATS[n].base+" °C";},reg));
    curseur(c1,maj,P,"Déperditions du bâtiment G","G",1,10,0.5,1," kW/K",touche,reg);
    curseur(c1,maj,P,"Puissance de la PAC, en part de la base","part",30,120,5,0," %",touche,reg);
    maj.push(choixListe(c1,P,"emet",NOMS_EMETTEURS,"Émetteurs",touche,
      function(n){return EMETTEURS[n].tbase+" °C par temps de base";},reg));
    maj.push(choixListe(c2,P,"appoint",["électrique","gaz"],"Appoint",touche,null,reg));
    maj.push(choixListe(c2,P,"mode",["parallèle","alternatif"],"Bivalence",touche,
      function(n){return n==="parallèle"?"la PAC continue sous le point de bivalence":"l'appoint seul sous le point de bivalence";},reg));
    curseur(c2,maj,P,"Prix du kWh électrique","pe",10,40,0.5,1," ct",touche,reg);
    curseur(c2,maj,P,"Prix du kWh de gaz","pg",5,20,0.5,1," ct",touche,reg);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; reset();
    });
    maj.push(function(){vS.textContent=selS.value==="0"?"réglages à la main":"chargé";});

    var cmd=E("div",{style:"display:flex;gap:8px;margin:10px 0 6px;flex-wrap:wrap"});
    var bLire=E("button",{"class":"bt p",type:"button"},"Lire");
    var bMois=E("button",{"class":"bt",type:"button"},"+ 1 mois");
    var bRaz=E("button",{"class":"bt",type:"button"},"Recommencer");
    cmd.appendChild(bLire); cmd.appendChild(bMois); cmd.appendChild(bRaz); d.appendChild(cmd);

    var W=680,H=360, X0=54,X1=420,Y0=26,Y1=180, XB=54,YB=236,HB=96;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Température extérieure jour par jour, puis chaleur fournie par la PAC et par l'appoint, mois par mois"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    var NJ=212, TINT=19, SEUIL=16;
    var S_={}, anim=null, acc=0, dernier=0;

    function climat(){ return CLIMATS[P.climat]; }
    function pn(){                  /* puissance nominale a +7/35, deduite de la part de la base */
      var c=climat(), pbase=P.G*(TINT-c.base);
      return P.part/100*pbase/(1+0.03*(c.base-7));
    }
    function ppac(te){ return Math.max(0, pn()*(1+0.03*(te-7))); }
    function tdep(te){ var e=EMETTEURS[P.emet]; return Math.max(25, Math.min(e.tbase, TINT+e.pente*(TINT-te))); }
    function cop(te){
      var td=tdep(te), c=0.40*(td+273.15)/Math.max(8, td-te);
      if (te>-3&&te<5) c*=0.9;                       /* le givrage et son degivrage */
      return Math.max(1.3, Math.min(5.5, c));
    }
    function tbiv(){
      var G=P.G, p=pn();
      return (SEUIL*G-0.79*p)/(G+0.03*p);
    }
    function text(j){                /* jour 0..211, une temperature moyenne du jour */
      var c=climat(), pos=j/NJ*7, i=Math.min(6,Math.floor(pos)), f=pos-i;
      var tm=c.tm[i]*(1-f)+c.tm[Math.min(6,i+1)]*f;
      var bruit=Math.sin(j*0.9)*0.5+Math.sin(j*0.23+1.7)*0.45+Math.sin(j*0.07+0.4)*0.35;   /* des vagues de froid de quelques jours */
      return tm+c.amp*bruit;
    }
    function mois(j){ var s=0; for (var i=0;i<7;i++){ s+=JOURS_MOIS[i]; if (j<s) return i; } return 6; }

    function reset(){
      maj.forEach(function(x){x();});
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      S_={j:0, tr:[], mB:[0,0,0,0,0,0,0], mP:[0,0,0,0,0,0,0], mA:[0,0,0,0,0,0,0], mE:[0,0,0,0,0,0,0], mEA:[0,0,0,0,0,0,0],
          besoin:0, chP:0, chA:0, elP:0, elA:0, gazA:0, jApp:0, jours:0, copMin:9, teMin:99, jourApp:[], ppacJour:[]};
      dessine(); acc=0;
    }
    function pas(){
      var j=S_.j; if (j>=NJ) return;
      var te=text(j), m=mois(j);
      var besoin=P.G*Math.max(0,SEUIL-te)*24;          /* kWh du jour */
      var cap=ppac(te)*24, c=cop(te);
      var chP, chA;
      if (besoin<=0){ chP=0; chA=0; }
      else if (P.mode==="alternatif"&&te<tbiv()){ chP=0; chA=besoin; }
      else { chP=Math.min(besoin,cap); chA=besoin-chP; }
      var elP=chP/c, elA=0, gazA=0;
      if (chA>0){ if (P.appoint==="gaz") gazA=chA/0.95; else elA=chA; S_.jApp++; }
      S_.mB[m]+=besoin; S_.mP[m]+=chP; S_.mA[m]+=chA; S_.mE[m]+=elP; S_.mEA[m]+=elA+gazA;
      S_.besoin+=besoin; S_.chP+=chP; S_.chA+=chA; S_.elP+=elP; S_.elA+=elA; S_.gazA+=gazA;
      if (besoin>0){ S_.jours++; if (c<S_.copMin) S_.copMin=c; }
      if (te<S_.teMin) S_.teMin=te;
      S_.tr.push(te); S_.jourApp.push(chA>0); S_.ppacJour.push(cap);
      S_.j++;
    }

    function px(j){return X0+(X1-X0)*j/NJ;}
    function py(t){return Y1-(Y1-Y0)*(t+16)/40;}
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"middle","class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function dessine(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* la temperature, jour par jour, avec le point de bivalence */
      var s=0;
      for (var i=0;i<7;i++){
        var x=px(s);
        svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1,stroke:V("trait2"),"stroke-width":"1",opacity:"0.6"}));
        txt(px(s+JOURS_MOIS[i]/2),Y1+14,MOIS_SAISON[i]);
        s+=JOURS_MOIS[i];
      }
      [-10,0,10,20].forEach(function(t){
        svg.appendChild(S("line",{x1:X0,y1:py(t),x2:X1,y2:py(t),stroke:V("trait2"),"stroke-width":"1",opacity:"0.4"}));
        txt(X0-6,py(t)+4,t+" °C","s-pet","end");
      });
      var tb=tbiv();
      if (tb>-16&&tb<24){
        svg.appendChild(S("line",{x1:X0,y1:py(tb),x2:X1,y2:py(tb),stroke:V("chaud"),"stroke-width":"1.5","stroke-dasharray":"5 4"}));
        txt(X1+6,py(tb)+4,"bivalence "+fr(tb,1)+" °C","s-pet","start","chaud");
      }
      /* les jours avec appoint, en fond */
      for (var j=0;j<S_.tr.length;j++) if (S_.jourApp[j])
        svg.appendChild(S("rect",{x:px(j),y:Y0,width:Math.max(0.6,px(j+1)-px(j)),height:Y1-Y0,fill:V("chaud"),opacity:"0.12"}));
      if (S_.tr.length>1){
        var pts=[];
        for (var j2=0;j2<S_.tr.length;j2++) pts.push(px(j2).toFixed(1)+","+py(S_.tr[j2]).toFixed(1));
        svg.appendChild(S("polyline",{points:pts.join(" "),fill:"none",stroke:V("froid"),"stroke-width":"1.8","stroke-linejoin":"round"}));
      }
      txt(X0,Y0-8,"extérieur, jour par jour · en rose, les jours où l'appoint a marché","s-pet","start");
      /* les mois : chaleur PAC et appoint empilees, COP du mois en chiffre */
      var mx=1; for (var i2=0;i2<7;i2++) mx=Math.max(mx,S_.mB[i2]);
      var lb=(X1-XB)/7;
      for (var i3=0;i3<7;i3++){
        var hP=(HB-18)*S_.mP[i3]/mx, hA=(HB-18)*S_.mA[i3]/mx, x0=XB+i3*lb+8, w=lb-16;   /* 18 px de marge pour le COP du mois */
        svg.appendChild(S("rect",{x:x0,y:YB+HB-hP,width:w,height:hP,fill:V("froid"),opacity:"0.85"}));
        svg.appendChild(S("rect",{x:x0,y:YB+HB-hP-hA,width:w,height:hA,fill:V("chaud"),opacity:"0.85"}));
        txt(x0+w/2,YB+HB+14,MOIS_SAISON[i3]);
        if (S_.mE[i3]>0) txt(x0+w/2,YB+HB-hP-hA-6,"COP "+fr(S_.mP[i3]/S_.mE[i3],1),"s-pet","middle","encre");
      }
      txt(XB,YB-8,"chaleur du mois : PAC en bleu, appoint en rouge, et le COP du mois","s-pet","start");
      /* le compte rendu */
      var fini=S_.j>=NJ, jd=Math.max(0,S_.j-1), m=mois(jd), jm=jd-[0,31,61,92,123,151,182][m];
      var scop=S_.elP>0?S_.chP/S_.elP:0, couv=S_.besoin>0?100*S_.chP/S_.besoin:0;
      var cout=(S_.elP+S_.elA)*P.pe/100+S_.gazA*P.pg/100;
      var coutSansPac=P.appoint==="gaz"?S_.besoin/0.95*P.pg/100:S_.besoin*P.pe/100;
      var c=climat();
      res.innerHTML="<div class='gros'>"+
        "<span><b>Date</b><span>"+(fini?"30 avril":(S_.j?(jm+1)+" "+MOIS_SAISON[m]:"1 oct."))+"</span></span>"+
        "<span><b>PAC nominale (+7/35)</b><span>"+fr(pn(),1)+" kW</span></span>"+
        "<span><b>Puissance de base</b><span>"+fr(P.G*(TINT-c.base),0)+" kW à "+c.base+" °C</span></span>"+
        "<span><b>Point de bivalence</b><span>"+fr(tbiv(),1)+" °C</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Besoin cumulé</b><span>"+fr(S_.besoin/1000,1)+" MWh</span></span>"+
        "<span><b>Fourni par la PAC</b><span>"+fr(couv,0)+" %</span></span>"+
        "<span><b>Jours avec appoint</b><span>"+S_.jApp+"</span></span>"+
        "<span><b>COP le plus bas</b><span>"+(S_.copMin<9?fr(S_.copMin,1):"—")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>SCOP à ce jour</b><span>"+(scop?fr(scop,2):"—")+"</span></span>"+
        "<span><b>Électricité PAC</b><span>"+fr(S_.elP/1000,2)+" MWh</span></span>"+
        "<span><b>Appoint</b><span>"+fr((S_.elA+S_.gazA)/1000,2)+" MWh "+(P.appoint==="gaz"?"de gaz":"électriques")+"</span></span>"+
        "<span><b>Coût</b><span>"+fr(cout,0)+" €</span></span>"+
        "<span><b>Sans PAC, "+(P.appoint==="gaz"?"chaudière seule":"tout électrique")+"</b><span>"+fr(coutSansPac,0)+" €</span></span>"+
        "</div><p>"+(!S_.j
          ? "Appuyez sur <b>Lire</b>, ou avancez d'un mois. Le point de bivalence est la température extérieure sous laquelle la PAC ne suffit plus."
          : fini
          ? "<b>Saison finie.</b> La PAC a fourni "+fr(couv,0)+" % de la chaleur avec un SCOP de "+fr(scop,2)+
            ", l'appoint a marché "+S_.jApp+" jour"+(S_.jApp>1?"s":"")+"."+
            (scop<3?" <b>Un SCOP sous 3</b> : les émetteurs demandent une eau trop chaude, ou le climat est trop froid pour cette machine.":"")+
            (couv<80?" <b>Moins de 80 % par la PAC</b> : elle est trop petite pour ce climat, l'appoint fait le travail aux pires jours, au prix fort.":"")+
            (P.part>=100?" <b>Une PAC à 100 % de la base</b> ne gagne presque rien sur la couverture et coûte le double : la base n'arrive que quelques jours.":"")
          : "Le COP suit l'écart entre le départ d'eau et l'extérieur : il descend quand il fait froid, et plus encore quand les émetteurs veulent de l'eau chaude.")+"</p>";
    }
    function boucle(ts){
      if (!dernier) dernier=ts;
      acc+=(ts-dernier)*0.012; dernier=ts;
      var n=Math.floor(acc); acc-=n;
      for (var i=0;i<n;i++) pas();
      dessine();
      if (S_.j<NJ) anim=requestAnimationFrame(boucle);
      else { anim=null; bLire.textContent="Lire"; }
    }
    bLire.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";return;}
      if (S_.j>=NJ) reset();
      dernier=0; bLire.textContent="Pause"; anim=requestAnimationFrame(boucle);
    });
    bMois.addEventListener("click",function(){
      if (anim){cancelAnimationFrame(anim);anim=null;bLire.textContent="Lire";}
      if (S_.j>=NJ) return;
      var m=mois(S_.j), fin=[31,61,92,123,151,182,212][m];
      while (S_.j<fin) pas();
      dessine();
    });
    bRaz.addEventListener("click",reset);
    reset();
  }
};

/* ═══════════════════════════════════════════ CE QUE CONTIENT UN KILO D'AIR
   Fiche enthalpie. Deux airs, A et B, chacun par sa temperature et son
   humidite relative. Pour chacun, h en trois morceaux : l'air sec (1,006 θ),
   la vaporisation de son eau (2 501 r), et la vapeur rechauffee (1,83 θ r).
   Puis la difference, ce qu'elle vaut en puissance pour un debit, et ce que
   le thermometre seul en aurait dit : c'est tout l'argument de la fiche. */
OUTILS["enthalpie-air"] = {
  titre:"Ce que contient un kilogramme d'air",
  intro:"Deux airs, et pour chacun son enthalpie en morceaux : ce que porte "+
        "l'air sec, ce que porte son eau. Puis la différence, ce qu'elle vaut "+
        "pour un débit, et ce que le thermomètre seul en aurait dit.",
  monte:function(d){
    var DEF={t1:30, p1:60, t2:14, p2:95, qm:1.5};
    var P={}; for (var k0 in DEF) P[k0]=DEF[k0];
    var SCEN=[
      ["Libre", null],
      ["1 · Deux airs à 20 °C, l'un sec, l'autre humide", {t1:20,p1:30,t2:20,p2:80,qm:1}],
      ["2 · L'air neuf d'hiver, chauffé à 19 °C", {t1:-7,p1:90,t2:19,p2:15,qm:1}],
      ["3 · La batterie froide d'été", {}],
      ["4 · L'humidificateur à vapeur", {t1:19,p1:15,t2:19,p2:40,qm:1}],
      ["5 · La salle de bains et le séjour", {t1:24,p1:90,t2:19,p2:40,qm:1}]
    ];
    var maj=[], reg={}, enScen=false;
    var g=E("div",{"class":"g2"}), c1=E("div"), c2=E("div");
    var chS=E("div",{"class":"champ"});
    chS.appendChild(E("label",{},"Deux airs à comparer"));
    var vS=E("span",{"class":"v"},""); chS.appendChild(vS);
    var selS=E("select",{},SCEN.map(function(s,i){
      return '<option value="'+i+'"'+(i===3?" selected":"")+'>'+s[0]+"</option>";}).join(""));
    chS.appendChild(selS); c1.appendChild(chS);
    function touche(){ if(!enScen){selS.value="0";} calc(); }
    curseur(c1,maj,P,"Air A · température","t1",-15,40,0.5,1," °C",touche,reg);
    curseur(c1,maj,P,"Air A · humidité relative","p1",5,100,1,0," %",touche,reg);
    curseur(c2,maj,P,"Air B · température","t2",-15,40,0.5,1," °C",touche,reg);
    curseur(c2,maj,P,"Air B · humidité relative","p2",5,100,1,0," %",touche,reg);
    curseur(c2,maj,P,"Débit d'air sec","qm",0.1,5,0.1,1," kg/s",touche,reg);
    g.appendChild(c1); g.appendChild(c2); d.appendChild(g);
    selS.addEventListener("change",function(){
      var s=SCEN[+this.value]; if(!s[1]) return;
      enScen=true;
      for (var k in DEF) P[k]=DEF[k];
      for (var k2 in s[1]) P[k2]=s[1][k2];
      for (var k3 in reg) reg[k3].value=P[k3];
      enScen=false; calc();
    });

    var W=680,H=236, XZ=230, XM=640;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"L'enthalpie des deux airs, en trois morceaux : l'air sec, la vaporisation de l'eau, la vapeur réchauffée"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"}); d.appendChild(res);

    function morceaux(t,p){
      var r=rAir(t,p/100);
      return {r:r, sec:1.006*t, lat:r/1000*2501, vap:r/1000*1.83*t, h:hAirR(t,r)};
    }
    function txt(x,y,t,cls,anc,coul){
      svg.appendChild(S("text",{x:x,y:y,"text-anchor":anc||"start","class":cls||"s-pet",fill:V(coul||"encre2")},t));
    }
    function calc(){
      maj.forEach(function(x){x();});
      vS.textContent=selS.value==="0"?"réglages à la main":"chargé";
      var A=morceaux(P.t1,P.p1), B=morceaux(P.t2,P.p2);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      /* l'echelle : de la plus petite valeur negative a la plus grande enthalpie */
      var lo=Math.min(0,A.sec,B.sec), hi=Math.max(20,A.h,B.h,A.sec+A.lat,B.sec+B.lat)*1.08;
      function px(v){ return XZ+(XM-XZ)*(v-lo)/(hi-lo); }
      txt(24,20,"CE QUE CONTIENT 1 kg D'AIR SEC, ET SON EAU","s-tit","start","encre");
      /* le zero de reference */
      svg.appendChild(S("line",{x1:px(0),y1:34,x2:px(0),y2:176,stroke:V("encre"),"stroke-width":"1.5","stroke-dasharray":"3 3"}));
      txt(px(0),192,"0 : air sec et eau liquide à 0 °C","s-pet","middle");
      function barre(y,m,nom,det){
        txt(XZ-12,y+15,nom,"s-nom","end","encre");
        txt(XZ-12,y+32,det,"s-pet","end");
        /* l'air sec, a partir de zero, vers la gauche s'il fait moins de 0 °C */
        var x0=px(Math.min(0,m.sec)), x1=px(Math.max(0,m.sec));
        svg.appendChild(S("rect",{x:x0,y:y,width:Math.max(1,x1-x0),height:24,fill:V("chaud"),opacity:"0.8"}));
        /* l'eau : la vaporisation, puis la vapeur rechauffee, empilees apres l'air sec */
        var base=m.sec, xa=px(base), xb=px(base+m.lat), xc=px(base+m.lat+m.vap);
        svg.appendChild(S("rect",{x:Math.min(xa,xb),y:y,width:Math.max(1,Math.abs(xb-xa)),height:24,fill:V("froid"),opacity:"0.8"}));
        if (Math.abs(xc-xb)>0.5)
          svg.appendChild(S("rect",{x:Math.min(xb,xc),y:y,width:Math.abs(xc-xb),height:24,fill:V("violet"),opacity:"0.8"}));
        var xh=px(m.h);
        svg.appendChild(S("line",{x1:xh,y1:y-4,x2:xh,y2:y+28,stroke:V("encre"),"stroke-width":"2.5"}));
        txt(Math.min(xh+6,XM-4),y+17,"h = "+fr(m.h,1),"s-lab",xh+80>W?"end":"start","encre");
      }
      barre(44,A,"Air A",fr(P.t1,1)+" °C · "+fr(P.p1,0)+" % · r = "+fr(A.r,1)+" g/kg");
      barre(112,B,"Air B",fr(P.t2,1)+" °C · "+fr(P.p2,0)+" % · r = "+fr(B.r,1)+" g/kg");
      /* la legende */
      [["chaud","air sec : 1,006 θ"],["froid","vaporiser l'eau : 2 501 r"],["violet","vapeur réchauffée : 1,83 θ r"]].forEach(function(l,i){
        var x=24+i*206;
        svg.appendChild(S("rect",{x:x,y:210,width:18,height:12,fill:V(l[0]),opacity:"0.8"}));
        txt(x+24,220,l[1],"s-pet","start");
      });
      var dh=B.h-A.h, dsens=1.006*(P.t2-P.t1), dlat=dh-dsens;
      var phi=P.qm*dh, phiT=P.qm*1.006*(P.t2-P.t1), deau=P.qm*(B.r-A.r)/1000*3600;
      var parts=Math.abs(dh)>0.3?100*Math.abs(dlat)/Math.abs(dh):0;
      res.innerHTML="<div class='gros'>"+
        "<span><b>h de A</b><span>"+fr(A.h,1)+" kJ/kg</span></span>"+
        "<span><b>h de B</b><span>"+fr(B.h,1)+" kJ/kg</span></span>"+
        "<span><b>Δh = hB − hA</b><span>"+(dh>=0?"+ ":"− ")+fr(Math.abs(dh),1)+" kJ/kg</span></span>"+
        "<span><b>Dont l'eau</b><span>"+fr(parts,0)+" %</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Puissance, qm × Δh</b><span>"+fr(Math.abs(phi),1)+" kW "+(phi>=0?"à fournir":"à retirer")+"</span></span>"+
        "<span><b>Ce que dirait le thermomètre, qm × 1,006 × Δθ</b><span>"+fr(Math.abs(phiT),1)+" kW</span></span>"+
        "<span><b>Eau</b><span>"+(Math.abs(deau)<0.5?"aucune":fr(Math.abs(deau),1)+" kg/h "+(deau>0?"ajoutés":"retirés"))+"</span></span>"+
        "</div><p>"+(Math.abs(P.t2-P.t1)<0.3&&Math.abs(dh)>1
          ? "<b>Même température, et pourtant "+fr(Math.abs(dh),1)+" kJ/kg d'écart :</b> le thermomètre ne voit rien, l'enthalpie voit l'eau. Passer de l'un à l'autre coûte "+fr(Math.abs(phi),1)+" kW."
          : parts>35
          ? "<b>"+fr(parts,0)+" % de l'écart est de l'eau</b> qui s'est vaporisée ou condensée. Le calcul par la température seule donnerait "+fr(Math.abs(phiT),1)+" kW au lieu de "+fr(Math.abs(phi),1)+" : c'est la raison de lire h, et pas θ."
          : "Ici l'eau ne bouge presque pas : la différence d'enthalpie et le calcul par la température disent la même chose, à quelques pour cent près. Ce n'est vrai que tant que r ne change pas.")+
        (A.h<0||B.h<0?" Une enthalpie <b>négative</b> n'est pas une erreur : l'air est sous le zéro de référence, 0 °C, et seules les différences comptent.":"")+"</p>";
    }
    calc();
  }
};

OUTILS.ecs={
  titre:"Eau chaude sanitaire — puissance et stockage",
  intro:"Le profil de puisage d'un internat, heure par heure. Le stockage ne "+
        "change pas l'énergie : il change la puissance à installer.",
  monte:function(d){
    var P={n:40,tf:10,tc:60,sto:0};
    var maj=[];
    var W=680,H=250,X0=52,X1=650,Y0=20,Y1=190;
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Nombre d'élèves","n",5,200,5,0,"");
    ch(c1,"Température d'eau froide","tf",5,20,1,0," °C");
    ch(c2,"Température de production","tc",45,75,1,0," °C");
    ch(c2,"Volume de stockage","sto",0,1500,25,0," L");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Profil de puisage horaire"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var f=P.n/40, dt=P.tc-P.tf;
      var vol=PROFIL.map(function(x){return x*f;});
      var tot=0,mx=0,hp=0;
      vol.forEach(function(x,i){tot+=x;if(x>mx){mx=x;hp=i;}});
      var E_j=tot*1.163*dt/1000;                       /* kWh par jour */
      var P_inst=mx*1.163*dt/1000;                     /* kW en pointe, sans stockage */
      /* avec stockage : la pointe est ecretee de ce que le ballon peut fournir */
      var reste=Math.max(0,mx-P.sto);
      var P_sto=reste*1.163*dt/1000;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var lm=Math.max(mx,1);
      for(var i=0;i<24;i++){
        var x=X0+i*(X1-X0)/24, l=(X1-X0)/24-3;
        var h=(Y1-Y0)*vol[i]/lm;
        svg.appendChild(S("rect",{x:x,y:Y1-h,width:l,height:h,rx:2,
          fill:V(i===hp?"chaud":"froid"),opacity:i===hp?"0.85":"0.45"}));
        if(i%3===0)svg.appendChild(S("text",{x:x+l/2,y:Y1+18,"text-anchor":"middle",
          "class":"s-pet"},String(i)+" h"));
      }
      if(P.sto>0&&P.sto<mx){
        var ys=Y1-(Y1-Y0)*P.sto/lm;
        svg.appendChild(S("line",{x1:X0,y1:ys,x2:X1,y2:ys,stroke:V("vert"),
          "stroke-width":"2","stroke-dasharray":"6 4"}));
        svg.appendChild(S("text",{x:X1,y:ys-7,"text-anchor":"end","class":"s-nom",
          fill:V("vert")},"ce que le ballon absorbe"));
      }
      svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),
        "stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:X0,y:Y0+10,"class":"s-pet"},
        "litres puisés dans l'heure"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Volume du jour</b><span>"+fr(tot,0)+" L</span></span>"+
        "<span><b>Énergie du jour</b><span>"+frs(E_j,1)+" kWh</span></span>"+
        "<span><b>Pointe</b><span>"+fr(mx,0)+" L à "+hp+" h</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Sans stockage</b><span>"+frs(P_inst,1)+" kW</span></span>"+
        "<span><b>Avec ce ballon</b><span>"+frs(P_sto,1)+" kW</span></span>"+
        "</div><p>"+(P.sto<=0
        ? "Sans ballon, l'appareil doit couvrir seul l'heure de pointe : <b>"+
          frs(P_inst,1)+" kW</b> pour "+fr(tot,0)+" litres par jour."
        : P_sto<=0
        ? "<b>Le ballon absorbe toute la pointe.</b> La production peut être "+
          "dimensionnée sur la moyenne, pas sur le maximum — c'est tout "+
          "l'intérêt du stockage."
        : "Le ballon écrête la pointe : la puissance tombe de "+frs(P_inst,1)+
          " à <b>"+frs(P_sto,1)+" kW</b>, soit "+fr(100*(1-P_sto/P_inst),0)+
          " % de moins. L'énergie du jour, elle, n'a pas bougé.")+"</p>";
    }
    calc();
  }
};

/* ─────────── ou passent les 100 unites de combustible ─────────── */


/* ─────────── la loi d'emission, et la droite qu'on croit suivre ─────────── */


/* ─────────── simple flux et double flux ─────────── */


/* ─────────── boucle ouverte et boucle fermee ─────────── */


/* ─────────── bitube, monotube, pieuvre ─────────── */


/* ─────────── retour direct contre retour inverse ─────────── */
SCHEMAS["retour-inverse"]=function(el){
  var W=760,H=300;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Retour direct et retour inversé"});
  function bloc(x0,titre,inv){
    var y1=76,y2=210, xs=[x0+40,x0+110,x0+180,x0+250];
    svg.appendChild(S("text",{x:x0+150,y:38,"text-anchor":"middle","class":"s-tit",
      fill:V(inv?"vert":"chaud")},titre));
    /* depart en haut, retour en bas */
    svg.appendChild(S("line",{x1:x0,y1:y1,x2:x0+290,y2:y1,stroke:V("chaud"),
      "stroke-width":"3"}));
    svg.appendChild(S("line",{x1:x0,y1:y2,x2:x0+290,y2:y2,stroke:V("froid"),
      "stroke-width":"3"}));
    xs.forEach(function(x,i){
      svg.appendChild(S("rect",{x:x-17,y:126,width:34,height:34,rx:2,fill:V("carte"),
        stroke:V("encre2"),"stroke-width":"2"}));
      svg.appendChild(S("text",{x:x,y:148,"text-anchor":"middle","class":"s-nom"},
        String(i+1)));
      svg.appendChild(S("line",{x1:x,y1:y1,x2:x,y2:126,stroke:V("chaud"),
        "stroke-width":"2"}));
      svg.appendChild(S("line",{x1:x,y1:160,x2:x,y2:y2,stroke:V("froid"),
        "stroke-width":"2"}));
    });
    /* le circulateur, et le sens du retour */
    svg.appendChild(S("circle",{cx:x0,cy:(y1+y2)/2,r:"14",fill:V("carte"),
      stroke:V("encre2"),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x0,y:(y1+y2)/2+5,"text-anchor":"middle","class":"s-nom"},
      "P"));
    svg.appendChild(S("line",{x1:x0,y1:y1,x2:x0,y2:(y1+y2)/2-14,stroke:V("chaud"),
      "stroke-width":"3"}));
    svg.appendChild(S("line",{x1:x0,y1:(y1+y2)/2+14,x2:x0,y2:y2,stroke:V("froid"),
      "stroke-width":"3"}));
    svg.appendChild(S("text",{x:x0+150,y:250,"text-anchor":"middle","class":"s-nom",
      fill:V(inv?"vert":"chaud")},
      inv?"chaque circuit a la même longueur"
         :"le circuit 1 est le plus court : il prend tout le débit"));
  }
  bloc(50,"RETOUR DIRECT",false);
  bloc(420,"RETOUR INVERSÉ",true);
  /* en retour inverse le collecteur de retour repart de l'autre bout */
  svg.appendChild(S("line",{x1:420,y1:210,x2:420,y2:274,stroke:V("froid"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:420,y1:274,x2:710,y2:274,stroke:V("froid"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:710,y1:274,x2:710,y2:210,stroke:V("froid"),
    "stroke-width":"3"}));
  el.appendChild(svg);
  el.parentNode.appendChild(E("p",{"class":"leg-schema"},
    "En retour direct, l'eau qui traverse l'émetteur 1 parcourt bien moins de "+
    "chemin que celle du 4 : elle y passe en priorité, et le dernier émetteur "+
    "manque de débit. <b>Le retour inversé égalise les longueurs</b> — un peu "+
    "plus de tube, et l'équilibrage se fait tout seul."));
};


/* ═══════════════════════════════════════════════════ SYMBOLES HYDRAULIQUES
   Chaque symbole se dessine dans un cadre 64 x 44, trait de 2. Les
   conventions suivies sont celles des schemas de principe des sujets. */
function symbole(nom, coul){
  var s=S("svg",{viewBox:"0 0 64 44","class":"sym"});
  var c=coul||"encre";
  function L(x1,y1,x2,y2,ep){s.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,
    stroke:V(c),"stroke-width":ep||2,"stroke-linecap":"round"}));}
  function P(d,fill){s.appendChild(S("path",{d:d,fill:fill?V(c):"none",
    stroke:V(c),"stroke-width":2,"stroke-linejoin":"round"}));}
  function C2(cx,cy,r,fill){s.appendChild(S("circle",{cx:cx,cy:cy,r:r,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function R2(x,y,l,h,fill){s.appendChild(S("rect",{x:x,y:y,width:l,height:h,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function T2(x,y,txt,t2){s.appendChild(S("text",{x:x,y:y,"text-anchor":"middle",
    "class":"s-sym"},txt));}
  var noeud=22;                                   /* demi-largeur du papillon */
  function papillon(){P("M10,10L10,34L32,22Z");P("M54,10L54,34L32,22Z");}
  var d={
   "arret":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);L(24,8,40,8);},
   "reglage":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);
     L(24,8,40,8);L(20,34,44,6,2);},
   "v2v":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,14);
     R2(22,2,20,12);},
   "v3v":function(){L(0,22,10,22);L(54,22,64,22);L(32,44,32,34);
     P("M10,10L10,34L30,22Z");P("M54,10L54,34L34,22Z");
     P("M22,44L42,44L32,32Z");R2(22,0,20,12);L(32,12,32,18);},
   "clapet":function(){L(0,22,10,22);L(54,22,64,22);P("M10,10L10,34L32,22Z",true);
     L(32,8,32,36,2.5);},
   "soupape":function(){L(0,22,10,22);L(32,22,32,10);L(20,10,44,10);
     P("M10,10L10,34L32,22Z");L(32,10,44,2);L(38,4,46,8);L(54,22,64,22);
     P("M54,10L54,34L32,22Z");},
   "pompe":function(){L(0,22,8,22);L(56,22,64,22);C2(32,22,15);
     P("M25,13L45,22L25,31Z",true);},
   "echangeur":function(){R2(10,6,44,32);
     P("M16,10L26,22L16,34");P("M28,10L38,22L28,34");P("M40,10L50,22L40,34");},
   "vase":function(){L(32,44,32,34);P("M12,34L12,16A20,10 0 0 1 52,16L52,34Z");
     L(12,25,52,25,2);},
   "mano":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"P");},
   "sonde":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"T");},
   "filtre":function(){L(0,22,14,22);L(50,22,64,22);R2(14,10,36,24);
     L(20,10,20,34,1.5);L(26,10,26,34,1.5);L(32,10,32,34,1.5);L(38,10,38,34,1.5);
     L(44,10,44,34,1.5);},
   "purgeur":function(){L(32,44,32,30);C2(32,20,11);L(32,9,32,3);L(26,3,38,3);},
   "compteur":function(){L(0,22,12,22);L(52,22,64,22);R2(12,8,40,28);
     T2(32,28,"kWh");},
   "disconnecteur":function(){L(0,22,8,22);L(56,22,64,22);R2(8,10,48,24);
     L(24,10,24,34,1.5);L(40,10,40,34,1.5);T2(16,28,"B");T2(48,28,"A");}
  };
  (d[nom]||function(){})();
  return s;
}

var ORGANES_HYDRO=[
 {k:"echangeur",n:"Échangeur à plaques",rep:1,
  r:"Il transfère la chaleur du réseau urbain au circuit du bâtiment <b>sans que "+
    "les deux eaux se mélangent</b>. C'est la frontière entre le primaire, qui "+
    "appartient au fournisseur, et le secondaire, qui appartient au bâtiment.",
  ou:"Au cœur de la sous-station, entre primaire et secondaire.",
  ep:"Calculer sa puissance, tracer les deux circuits sur un DR, ou justifier "+
     "pourquoi les fluides ne se mélangent pas."},
 {k:"pompe",n:"Circulateur",rep:2,
  r:"Il met l'eau en mouvement et <b>fournit la pression que le réseau consomme</b> "+
    "en pertes de charge. Il ne crée pas de chaleur : il transporte.",
  ou:"Sur le départ ou le retour du secondaire, un par circuit.",
  ep:"Lire une courbe caractéristique, choisir une vitesse, trouver le point de "+
     "fonctionnement."},
 {k:"v3v",n:"Vanne 3 voies motorisée",rep:3,
  r:"Elle <b>mélange</b> deux eaux à températures différentes, ou <b>répartit</b> "+
    "un débit entre deux branches. C'est l'organe de régulation du départ : "+
    "l'automate lui donne un ordre, elle agit sur l'énergie.",
  ou:"En sortie de production, sur le départ du circuit de chauffage.",
  ep:"Identifier sa fonction — mélange ou répartition —, la placer sur un schéma, "+
     "expliquer le rôle du moteur."},
 {k:"v2v",n:"Vanne 2 voies motorisée",rep:4,
  r:"Elle <b>étrangle</b> un débit sans le dériver. En se fermant, elle augmente "+
    "la résistance du circuit et fait remonter la pression ailleurs — d'où la "+
    "nécessité d'un circulateur à pression variable.",
  ou:"Sur un émetteur, un aérotherme, une batterie de CTA.",
  ep:"La distinguer de la V3V, et en déduire l'effet sur le débit total."},
 {k:"arret",n:"Vanne d'arrêt",rep:5,
  r:"Elle isole une portion du circuit pour l'intervention. <b>Elle ne règle "+
    "rien</b> : elle est ouverte ou fermée.",
  ou:"De part et d'autre de tout organe démontable.",
  ep:"La repérer, et justifier pourquoi on en place deux autour d'une pompe."},
 {k:"reglage",n:"Vanne d'équilibrage",rep:6,
  r:"Elle ajoute <b>volontairement</b> de la perte de charge à une branche trop "+
    "favorisée, pour que chaque émetteur reçoive son débit. Elle porte une "+
    "graduation et se règle une fois pour toutes.",
  ou:"Sur le retour de chaque branche, ou de chaque colonne.",
  ep:"Expliquer l'équilibrage, lire un procès-verbal de réglage."},
 {k:"clapet",n:"Clapet anti-retour",rep:7,
  r:"Il ne laisse passer l'eau que <b>dans un sens</b>. Il empêche une pompe à "+
    "l'arrêt d'être traversée à l'envers par une pompe voisine.",
  ou:"En aval d'un circulateur, ou sur un remplissage.",
  ep:"Repérer le sens de circulation qu'il impose."},
 {k:"soupape",n:"Soupape de sécurité",rep:8,
  r:"Elle <b>s'ouvre toute seule</b> si la pression dépasse son tarage — 3 bar en "+
    "chauffage — et évacue de l'eau jusqu'à ce que la pression redescende. C'est "+
    "un organe de sécurité, jamais de régulation.",
  ou:"Sur la production, sans aucune vanne entre elle et le générateur.",
  ep:"Justifier son tarage, expliquer pourquoi rien ne doit pouvoir l'isoler."},
 {k:"vase",n:"Vase d'expansion",rep:9,
  r:"L'eau se dilate en chauffant. Le vase <b>absorbe ce volume</b> dans une "+
    "membrane comprimant un coussin d'azote. Sans lui, la pression monterait "+
    "jusqu'au déclenchement de la soupape à chaque chauffe.",
  ou:"Sur le retour, au plus près du générateur.",
  ep:"Calculer son volume à partir de la dilatation, ou expliquer son rôle."},
 {k:"mano",n:"Manomètre",rep:10,
  r:"Il indique la pression du circuit. Une pression qui baisse lentement signale "+
    "une fuite ; une pression qui monte à chaud signale un vase hors service.",
  ou:"Sur la production, près du remplissage.",
  ep:"Lire une valeur et la comparer à une consigne."},
 {k:"sonde",n:"Sonde de température",rep:11,
  r:"Elle <b>acquiert</b> l'information dont la régulation a besoin. Elle "+
    "appartient à la chaîne d'information, pas à la chaîne d'énergie.",
  ou:"Sur le départ, le retour, en ambiance, et en extérieur.",
  ep:"La placer dans la bonne chaîne, ou justifier son emplacement."},
 {k:"filtre",n:"Filtre — pot à boue",rep:12,
  r:"Il retient les particules qui useraient la pompe et boucheraient les "+
    "émetteurs. <b>Il s'encrasse, donc il se nettoie</b> : un filtre colmaté "+
    "ajoute une perte de charge considérable.",
  ou:"En amont du circulateur et de l'échangeur.",
  ep:"Expliquer sa présence, ou l'effet de son encrassement sur le débit."},
 {k:"purgeur",n:"Purgeur d'air",rep:13,
  r:"L'air dissous se rassemble aux points hauts et <b>bloque la circulation</b>. "+
    "Le purgeur l'évacue automatiquement.",
  ou:"À chaque point haut du réseau.",
  ep:"Justifier son emplacement — c'est presque toujours « au point haut »."},
 {k:"compteur",n:"Compteur d'énergie",rep:14,
  r:"Il mesure le débit et l'écart de température, et en déduit l'énergie "+
    "livrée. C'est lui qui fait la facture du réseau de chaleur.",
  ou:"Sur le primaire, côté fournisseur.",
  ep:"Retrouver l'énergie à partir de P = Q × 1 163 × ΔT."},
 {k:"disconnecteur",n:"Disconnecteur",rep:15,
  r:"Il empêche l'eau du circuit de chauffage de <b>revenir dans le réseau "+
    "d'eau potable</b>. C'est une obligation sanitaire sur tout remplissage.",
  ou:"Sur la conduite de remplissage, entre l'eau de ville et le circuit.",
  ep:"Le nommer et donner sa fonction sanitaire."}
];

OUTILS["symboles-hydro"]={
  titre:"Les symboles d'un circuit hydraulique",
  intro:"Quinze symboles suffisent à lire la quasi-totalité des schémas de "+
        "l'épreuve. Cliquez-en un : son rôle, sa place, et ce que l'épreuve "+
        "en demande.",
  monte:function(d,el){
    var grille=E("div",{"class":"grille-sym"});
    var carte=E("div",{"class":"res",style:"margin-top:14px"});
    d.appendChild(grille);d.appendChild(carte);
    function montre(i){
      [].forEach.call(grille.children,function(b,k){
        b.className="case-sym"+(k===i?" on":"");});
      var o=ORGANES_HYDRO[i];
      carte.innerHTML="<div class='gro' style='font-weight:600;font-size:17px;"+
        "margin-bottom:8px'>"+o.rep+" · "+o.n+"</div>"+
        "<p><b>Rôle</b> "+o.r+"</p>"+
        "<p><b>Où on le trouve</b> "+o.ou+"</p>"+
        "<p><b>Ce que l'épreuve demande</b> "+o.ep+"</p>";
      [].forEach.call(carte.querySelectorAll("p b:first-child"),function(b){
        b.style.cssText="font-family:'Bricolage Grotesque',sans-serif;font-size:10.5px;"+
          "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
          "display:block;margin-bottom:1px";});
    }
    ORGANES_HYDRO.forEach(function(o,i){
      var b=E("button",{"class":"case-sym",type:"button"});
      b.appendChild(symbole(o.k));
      b.appendChild(E("span",{},o.rep+" · "+o.n));
      b.addEventListener("click",function(){montre(i);});
      grille.appendChild(b);
    });
    montre(0);
  }
};

/* ─────────── le schema de principe d'une sous-station ─────────── */
/* ─────────────────────────────────────────────── le cycle sur le diagramme
   enthalpique (log p, h) — dit « diagramme de Mollier » en froid.
   La courbe de saturation est SCHEMATIQUE : elle a la forme d'un vrai
   diagramme — liquide raide, vapeur presque plate, point critique au
   sommet — mais elle n'est celle d'aucun fluide. Les enthalpies portees
   sont celles de l'exemple traite dans la page, et elles bouclent :
   qk = qo + w. Un schema qui ne bouclerait pas apprendrait a ne pas
   verifier. */
/* Deux noms, un seul dessin. « cycle-mollier » porte les valeurs lues ;
   « cycle-mollier-muet » ne porte que les symboles — c'est la version
   qui accompagne une question, ou le diagramme donnerait la reponse. */
function dessineMollier(el,chiffre){
  var W=740,H=440,X0=64,X1=690,Y0=44,Y1=336;
  var HMIN=190,HMAX=500,PMIN=1,PMAX=60;          /* kJ/kg et bar absolus */
  var H1=425,H2=460,H3=270,BP=9.3,HP=30;         /* l'exemple de la page */

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Cycle frigorifique sur le diagramme enthalpique"});
  el.appendChild(svg);

  function px(h){return X0+(h-HMIN)/(HMAX-HMIN)*(X1-X0);}
  function u(p){return (Math.log(p)-Math.log(PMIN))/(Math.log(PMAX)-Math.log(PMIN));}
  function py(p){return Y1-u(p)*(Y1-Y0);}         /* l'axe des pressions est LOG */
  /* La cloche est SCHEMATIQUE — forme d'un vrai diagramme, fluide d'aucun.
     Les exposants sont cales pour que les quatre points du cycle tombent
     dans la bonne zone : 3 en liquide sous-refroidi, 4 sous la cloche,
     1 et 2 en vapeur surchauffee. Un schema ou le point 3 serait dans le
     melange enseignerait le contraire de ce que dit le texte. */
  function hL(p){return 200+140*Math.pow(u(p),2.692);}
  function hV(p){return 430- 90*Math.pow(u(p),2.952);}

  /* -- la grille */
  [1,2,3,5,10,20,30,60].forEach(function(p){
    svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-9,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
      String(p)));
  });
  for(var h=200;h<=HMAX;h+=50){
    svg.appendChild(S("line",{x1:px(h),y1:Y0,x2:px(h),y2:Y1,stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:px(h),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
      String(h)));
  }
  svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+60,"text-anchor":"middle","class":"s-pet"},
    "enthalpie massique h  (kJ/kg)"));
  var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
    transform:"translate(17,"+((Y0+Y1)/2)+") rotate(-90)"});
  lab.textContent="pression absolue p  (bar, échelle log)";
  svg.appendChild(lab);

  /* -- la courbe de saturation, en une seule cloche */
  var d="",p,k=0;
  for(p=PMIN;p<=PMAX;p*=1.05) d+=(k++?"L":"M")+px(hL(p)).toFixed(1)+","+py(p).toFixed(1);
  d+="L"+px(340).toFixed(1)+","+py(PMAX).toFixed(1);
  for(p=PMAX;p>=PMIN;p/=1.05) d+="L"+px(hV(p)).toFixed(1)+","+py(p).toFixed(1);
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"2.5"}));
  svg.appendChild(S("circle",{cx:px(340),cy:py(PMAX),r:4,fill:V("froid")}));
  svg.appendChild(S("text",{x:px(340),y:py(PMAX)-12,"text-anchor":"middle",
    "class":"s-pet",fill:V("froid")},"point critique"));

  /* -- les trois zones : la premiere lecture a savoir faire */
  [[224,2.4,"liquide"],[330,2.4,"mélange liquide + vapeur"],[458,2.4,"vapeur surchauffée"]]
    .forEach(function(z){
      svg.appendChild(S("text",{x:px(z[0]),y:py(z[1]),"text-anchor":"middle",
        "class":"s-pet",fill:V("encre2")},z[2]));
    });

  /* -- le cycle : 1 aspiration, 2 refoulement, 3 liquide, 4 apres detente */
  var P1=[px(H1),py(BP)],P2=[px(H2),py(HP)],P3=[px(H3),py(HP)],P4=[px(H3),py(BP)];
  function trait(a,b,coul){
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),
      "stroke-width":"3.5","stroke-linecap":"round"}));
  }
  trait(P4,P1,"froid");            /* evaporation  */
  trait(P1,P2,"chaud");            /* compression  */
  trait(P2,P3,"chaud");            /* condensation */
  trait(P3,P4,"encre");            /* detente      */

  /* Chaque point porte SON enthalpie. Ce n'est pas une reponse — les
     questions demandent des differences et des rapports — et sans elle on ne
     lit qu'a la graduation de 50 kJ/kg, ce qui interdit tout calcul juste. */
  [[P1,"1",9,16,H1,10,34],[P2,"2",9,-9,H2,10,-26],
   [P3,"3",-16,-9,H3,-18,20],[P4,"4",-16,16,H3,-18,34]].forEach(function(q){
    svg.appendChild(S("circle",{cx:q[0][0],cy:q[0][1],r:5.5,fill:V("carte"),
      stroke:V("encre"),"stroke-width":"2.5"}));
    svg.appendChild(S("text",{x:q[0][0]+q[2],y:q[0][1]+q[3],"class":"s-nom"},q[1]));
    svg.appendChild(S("text",{x:q[0][0]+q[5],y:q[0][1]+q[6],"class":"s-pet",
      "text-anchor":q[5]<0?"end":"start",fill:V("encre2")},q[4]+" kJ/kg"));
  });

  /* -- ce que chaque segment vaut. Les deux mesures horizontales sont posees
        LOIN l'une de l'autre : cote a cote, elles se chevauchaient. */
  function mesure(x1,x2,y,texte,coul,dessous){
    svg.appendChild(S("line",{x1:x1,y1:y,x2:x2,y2:y,stroke:V(coul),"stroke-width":"1.5",
      "stroke-dasharray":"5 4"}));
    svg.appendChild(S("text",{x:(x1+x2)/2,y:y+(dessous?15:-7),"text-anchor":"middle",
      "class":"s-pet",fill:V(coul)},texte));
  }
  mesure(px(H3),px(H1),Y1-16,chiffre?"qo = h1 − h4 = 155 kJ/kg":"qo","froid",false);
  mesure(px(H3),px(H2),py(HP)-26,chiffre?"qk = h2 − h3 = 190 kJ/kg":"qk","chaud",false);
  svg.appendChild(S("text",{x:(P1[0]+P2[0])/2+30,y:(P1[1]+P2[1])/2,"class":"s-pet",
    fill:V("chaud")},chiffre?"w = h2 − h1 = 35":"w"));

  /* -- la detente est VERTICALE : c'est la lecture qui surprend le plus */
  svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2-4,"text-anchor":"end",
    "class":"s-pet",fill:V("encre2")},"détente"));
  if(chiffre)svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2+12,
    "text-anchor":"end","class":"s-pet",fill:V("encre2")},"h constante"));

  if(!chiffre)return;
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  lect.innerHTML="<strong>qk = qo + w</strong> — 190 = 155 + 35. Le condenseur évacue "+
    "tout ce que l'évaporateur a pris, <em>plus</em> le travail du compresseur. "+
    "Un relevé qui ne boucle pas est un relevé faux.<br>"+
    "<strong>EER = qo / w = 4,43</strong> et <strong>COP = qk / w = 5,43</strong> : "+
    "exactement une unité d'écart, et c'est la même relation que Q<sub>chaud</sub> = "+
    "Q<sub>froid</sub> + W, lue sur le diagramme.";
  el.appendChild(lect);
}
SCHEMAS["cycle-mollier"]     =function(el){dessineMollier(el,true);};
SCHEMAS["cycle-mollier-muet"]=function(el){dessineMollier(el,false);};

SCHEMAS["sous-station"]=function(el){
  var W=860,H=430;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Schéma de principe d'une sous-station de chauffage urbain"});
  function tube(x1,y1,x2,y2,coul,ep){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":ep||3,"stroke-linecap":"round"}));
  }
  function rep(x,y,n){
    svg.appendChild(S("circle",{cx:x,cy:y,r:"12",fill:V("carte"),stroke:V("encre"),
      "stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x,y:y+5,"text-anchor":"middle","class":"s-rep"},
      String(n)));
  }
  function pose(k,x,y,n,coul,pos){
    var g=S("g",{transform:"translate("+(x-32)+","+(y-22)+")"});
    var s=symbole(k,coul);
    [].slice.call(s.childNodes).forEach(function(c){g.appendChild(c);});
    svg.appendChild(g);
    if(n){if(pos==="g")rep(x-30,y,n);else rep(x+26,y-26,n);}
  }
  var YA=104, YR=250, XE=340;

  /* le primaire, a gauche */
  svg.appendChild(S("rect",{x:8,y:52,width:XE-40,height:250,fill:V("froid"),
    opacity:"0.06"}));
  svg.appendChild(S("text",{x:20,y:40,"class":"s-tit",fill:V("froid")},
    "PRIMAIRE — RÉSEAU DE CHALEUR URBAIN"));
  tube(20,YA,XE-30,YA,"chaud");
  tube(20,YR,XE-30,YR,"froid");
  svg.appendChild(S("text",{x:20,y:YA-12,"class":"s-nom",fill:V("chaud")},"< 110 °C"));
  pose("compteur",110,YA,14);
  pose("filtre",210,YA,12);
  pose("arret",110,YR,5);

  /* l'echangeur */
  pose("echangeur",XE,(YA+YR)/2,1,"vert");
  tube(XE-30,YA,XE-30,(YA+YR)/2-16,"chaud");
  tube(XE-30,YR,XE-30,(YA+YR)/2+16,"froid");
  tube(XE+30,(YA+YR)/2-16,XE+30,YA,"chaud");
  tube(XE+30,(YA+YR)/2+16,XE+30,YR,"froid");

  /* le secondaire, a droite */
  svg.appendChild(S("rect",{x:XE+40,y:52,width:W-XE-58,height:250,fill:V("chaud"),
    opacity:"0.05"}));
  svg.appendChild(S("text",{x:XE+52,y:40,"class":"s-tit",fill:V("chaud")},
    "SECONDAIRE — CIRCUIT DU BÂTIMENT   70 / 55 °C"));
  tube(XE+30,YA,W-30,YA,"chaud");
  tube(XE+30,YR,W-30,YR,"froid");
  pose("v3v",470,YA,3);
  pose("pompe",580,YA,2);
  pose("sonde",700,YA,11);

  /* les emetteurs */
  [760,820].forEach(function(x,i){
    svg.appendChild(S("rect",{x:x-18,y:150,width:36,height:54,rx:2,fill:V("carte"),
      stroke:V("chaud"),"stroke-width":"2"}));
    for(var k=0;k<3;k++)svg.appendChild(S("line",{x1:x-10+k*10,y1:154,
      x2:x-10+k*10,y2:200,stroke:V("chaud"),"stroke-width":"1.5"}));
    tube(x,YA,x,150,"chaud",2.5);
    tube(x,204,x,YR,"froid",2.5);
  });
  svg.appendChild(S("text",{x:790,y:224,"text-anchor":"middle","class":"s-nom"},
    "émetteurs"));
  pose("v2v",760,YA-0,4);
  pose("reglage",820,YR,6);
  pose("clapet",624,YA,7);
  pose("purgeur",552,YA-34,13,null,"g");
  tube(552,YA-24,552,YA,"chaud",2);

  /* la securite, en bas du secondaire */
  tube(430,YR,430,340,"froid",2.5);
  pose("soupape",430,362,8);
  tube(530,YR,530,336,"froid",2.5);
  pose("vase",530,358,9);
  pose("mano",620,YR+40,10);
  tube(620,YR,620,YR+18,"froid",2);
  pose("disconnecteur",250,YR+40,15);
  tube(250,YR,250,YR+18,"froid",2);
  svg.appendChild(S("text",{x:250,y:YR+84,"text-anchor":"middle","class":"s-nom"},
    "remplissage"));

  svg.appendChild(S("text",{x:W/2,y:H-8,"text-anchor":"middle","class":"s-nom"},
    "Les deux eaux ne se mélangent jamais : elles échangent à travers une paroi."));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les numéros renvoient à la bibliothèque de symboles. <b>Suivez un fluide du "+
    "doigt</b>, d'un bout à l'autre, en nommant chaque organe rencontré : si vous "+
    "y arrivez, vous savez lire le schéma."));
};

/* ═══════ Quatre schemas pour les fiches d'automatismes de la 2de ═══════
   Ajoutes le 9 septembre 2026. Comme les vingt et un precedents, ils ne
   parlent d'aucun metier : c'est ce qui les rend reutilisables ailleurs. */

/* ─────────── un repere orthogonal, et quatre points a lire ─────────── */


/* ─────────── lire une image, puis un antecedent, sur la meme courbe ─────────── */


/* ─────────── les quatre crochets, sur la meme portion de droite ─────────── */


/* ─────────── reconnaitre Pythagore, reconnaitre Thales ─────────── */


/* ─────────── la pile zinc-cuivre, et le chemin des electrons ───────────
   Ajoute le 18 septembre 2026 pour la Tle CTRM, sequence 2. Il sert aussi
   en sequence 9 : la corrosion est la meme reaction, sans le fil. */


/* ─────────── ce que pese l'energie, pour un meme besoin ───────────
   Une seule mesure, donc une seule teinte, plus l'accent sur la ligne qui
   porte le message. Les barres sont A L'ECHELLE : celle du gazole est
   presque invisible, et c'est exactement ce qu'il faut voir. */


/* ─────────── le banc de l'activite 2, dans les deux sens ───────────
   L'accumulateur est A LA MEME PLACE dans les deux panneaux — montant de
   droite. Seule la fleche change, et c'est tout le propos de la seance.
   Les valeurs sont celles d'un NiMH format AA : 1,2 V nominal, 2 000 mA·h. */


/* ─────────── la decharge complete, d'ou sortent Q et E ───────────
   Le prolongement du banc de la seance 2, a courant constant. Les nombres
   sont ceux de l'accumulateur AA, JAMAIS ceux des tableaux i) et j) du
   polycopie : la fiche montre comment on lit, elle ne rend pas la copie. */


/* ─────────── peser l'accumulateur, puis remonter au camion ───────────
   Une manip de trente secondes qui ancre la table de l'activite 4 : le
   W·h/kg cesse d'etre un nombre lu quelque part. */


/* ══════════════════════════════════ SCHEMAS — Tle CTRM, sequence 3
   Vecteurs dans l'espace. La convention d'axes est celle de la figure du
   polycopie, fig3-espace : x longueur vers la DROITE, y largeur en fuyante
   vers le haut-droit, z hauteur vers le HAUT. Un schema web qui inverserait
   deux axes ferait douter de la feuille, pas de lui-meme. */

/* ─────────── la caisse, et trois nombres pour un point ─────────── */


/* ─────────── les deux sangles, et pourquoi 2 + 2 ne font pas 4 ───────────
   A, B et S ont tous x = 4 : la figure est PLANE, et ce dessin en (y ; z)
   n'est donc pas une projection, c'est la vraie forme. */


/* ─────────── colineaires : la meme droite, pas le meme sens ─────────── */


/* ─────────── ce que dit la troisieme coordonnee ───────────
   Les deux panneaux sont vus DE COTE, et c'est indispensable : une vue de
   dessus ne peut pas montrer que z vaut zero, puisque tout y parait
   horizontal. Le premier essai la prenait, et ne demontrait rien. */


/* ══════════════════════════════ SCHEMAS — Tle CTRM, sequence 1
   Ajustement d'un nuage. Ce sont des GRAPHIQUES, pas des dessins, et deux
   regles les tiennent :

   — deux teintes de serie au maximum par graphique, « chaud » et « froid ».
     Eprouve au validateur : ecart 24,3 en vision normale et 18,7 en
     protanopie. « encre2 » est un GRIS — chroma 0,007, ecart 12,8 de
     « froid » — il ne peut donc pas porter une troisieme courbe. C'est la
     raison pour laquelle le comparatif a quatre modeles est fait en petits
     multiples : un seul trace par panneau, et le probleme disparait.

   — l'identite ne repose jamais sur la seule couleur : chaque courbe porte
     son nom en bout de trace, et le modele retenu porte le mot RETENU. */

/* nuage + courbe : helpers communs aux quatre */
function _pts(svg,X,Y,fx,fy,r){
  X.forEach(function(x,i){
    svg.appendChild(S("circle",{cx:fx(x),cy:fy(Y[i]),r:r||"3.6",fill:V("encre")}));
  });
}
function _courbe(svg,f,x0,x1,fx,fy,coul,ep,ymin,ymax,tirets){
  var d="",n=90,dessus=false;
  for(var k=0;k<=n;k++){
    var x=x0+(x1-x0)*k/n, y=f(x);
    if(y<ymin||y>ymax){ dessus=false; continue; }
    d+=(dessus?" L ":" M ")+fx(x).toFixed(1)+" "+fy(y).toFixed(1);
    dessus=true;
  }
  var at={d:d,fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linecap":"round"};
  if(tirets)at["stroke-dasharray"]=tirets;
  svg.appendChild(S("path",at));
}

/* ─────────── le meme nuage, les quatre modeles ─────────── */


/* ─────────── deux modeles que le R2 ne separe pas ─────────── */


/* ─────────── jusqu'ou les modeles restent d'accord ─────────── */


/* ─────────── le cafe : deux R2 excellents, une reponse absurde ─────────── */






/* ─────────── CAP · ce qu'une multiprise accepte ─────────── */


/* ─────────── CAP · l'ordre dans lequel les choses arrivent ─────────── */


/* ─────────── CAP · un chemin ou plusieurs ─────────── */


/* ─────────── CAP · ou se branchent les deux appareils ─────────── */


/* ─────────── CAP · la droite U-I et le quotient qui ne bouge pas ─────────── */




/* ─────────── CAP · ce qui rentre encore quand le radiateur tourne ─────────── */


/* ─────────── CAP · trouver l'ampoule grillee au voltmetre ─────────── */


/* ─────────── CAP · faire le tour ou couvrir la surface ─────────── */


/* ─────────── CAP · la diagonale, et les pouces ─────────── */


/* ─────────── CAP · ce que fait le courant selon son intensite ─────────── */


/* ─────────── CAP · la conversion decide du resultat ─────────── */




/* ─────────── CAP · deux appareils, deux protections ─────────── */


/* ─────────── CAP · un chiffre plutot qu'un adjectif ─────────── */


/* ─────────── CAP · c'est le plus faible qui fixe la limite ─────────── */


/* ─────────── CAP · proportionnel, ou pas ─────────── */


/* ─────────── CAP · le meme tableau, deux metiers ─────────── */


/* ─────────── CAP · decouper un local en rectangles ─────────── */


/* ─────────── CAP · l'angle droit au metre ruban ─────────── */




/* ─────────── 2DE CIEL · le facteur huit entre bits et octets ─────────── */


/* ─────────── 2DE CIEL · qui protege qui ─────────── */


/* ─────────── 2DE CIEL · jusqu'ou va la TBTS ─────────── */


/* ─────────── 2DE CIEL · la tension se partage ─────────── */


/* ─────────── 2DE CIEL · la resistance de la LED ─────────── */



/* ─────────── CAP · la puissance ne suffit pas ─────────── */


/* ─────────── CAP · deux offres qui se croisent ─────────── */


/* ─────────── TLE · les pertes en ligne, sous deux tensions ─────────── */


/* ─────────── TLE · le transformateur et ses deux bobines ─────────── */


/* ─────────── TLE · par ou la chaleur entre dans la remorque ─────────── */


/* ─────────── TLE · la caisse qui se rechauffe : droite ou courbe ─────────── */


/* ─────────── TLE · retirer toujours pareil, ou multiplier toujours pareil ─────────── */


/* ─────────── TLE · moins 20 %, puis plus 20 % ─────────── */


/* ─────────── TLE · le verre, piege a infrarouge ─────────── */


/* ─────────── TLE · du gazole au CO2, en quatre etapes ─────────── */


/* ─────────── TLE · la suite ne connait que les annees, la fonction tous les instants ─────────── */


/* ─────────── TLE · l'echelle de pH, un facteur dix par unite ─────────── */


/* ─────────── TLE · qui donne ses electrons a qui ─────────── */


/* ─────────── TLE · passivation ou rouille ─────────── */


/* ─────────── TLE · de la tole au bac ─────────── */


/* ─────────── TLE · le signe de la derivee, et le maximum ─────────── */


/* ─────────── TLE · poids et poussee ─────────── */


/* ─────────── TLE · l'arbre de la tournee ─────────── */


/* ─────────── TLE · au moins une fois ─────────── */


/* ─────────── TLE · la reflexion totale dans une fibre ─────────── */


/* ─────────── TLE · repartir son temps selon les points ─────────── */


/* ─────────── 2DE CIEL · une equation est une balance ─────────── */


/* ─────────── 2DE CIEL · de l'inequation a la reponse concrete ─────────── */


/* ─────────── 2DE CIEL · detecteurs piece par piece ─────────── */


/* ─────────── 2DE CIEL · la marge du generateur de brouillard ─────────── */


/* ─────────── 2DE CIEL · trois capteurs, trois formes de courbe ─────────── */


/* ─────────── 2DE CIEL · le transmetteur 4-20 mA ─────────── */


/* ─────────── 2DE CIEL · deux abonnements, un point de croisement ─────────── */


/* ─────────── 2DE CIEL · f(x) + k : monter, jamais glisser ─────────── */


/* ─────────── 2DE CIEL · plexiglas vers air : trois incidences ─────────── */


/* ─────────── 2DE CIEL · le spectre, du visible a la fibre ─────────── */


/* ─────────── 2DE CIEL · periode courte, son aigu ─────────── */


/* ─────────── 2DE CIEL · l'echelle des decibels ─────────── */


/* ─────────── 2DE CIEL · trois reglages, un poids ─────────── */


/* ─────────── 2DE CIEL · lire un enregistrement de positions ─────────── */


/* ─────────── 2DE CIEL · la vitesse du bord d'une pale ─────────── */


/* ─────────── 2DE CIEL · deux forces qui s'equilibrent ─────────── */


/* ─────────── 2DE CIEL · la dilution au dixieme ─────────── */


/* ─────────── 2DE CIEL · le pH qui monte vers 7 ─────────── */


/* ─────────── 2DE CIEL · trois tubes, deux couleurs ─────────── */


/* ─────────── 2DE CIEL · deux fournisseurs, meme moyenne ─────────── */


/* ─────────── 2DE CIEL · deux pourcentages, deux denominateurs ─────────── */


/* ─────────── 2DE CIEL · la fluctuation selon la taille ─────────── */


/* ─────────── 2DE CIEL · deux bornes, meme moyenne, deux ecarts types ─────────── */


/* ─────────── 2DE CIEL · regrouper, c'est remplacer par le centre ─────────── */


/* ─────────── CAP · la même eau sucrée dans trois récipients ─────────── */


/* ─────────── CAP · diluer, c'est completer jusqu'au trait ─────────── */


/* ─────────── CAP · comparer des newtons a des newtons ─────────── */


/* ─────────── CAP · repartir la charge sur deux tablettes ─────────── */


/* ─────────── CAP · la fluctuation, 60 lancers contre 600 ─────────── */


/* ─────────── CAP · la machine a pinces, sur cent parties ─────────── */


/* ─────────── CAP co-intervention · la verrerie de la paillasse ─────────── */


/* ─────────── CAP co-intervention · des grammes par litre ─────────── */


/* ─────────── CAP co-intervention · repos ou mouvement ─────────── */


/* ─────────── CAP co-intervention · deux forces, trois conditions ─────────── */


/* ─────────── CAP co-intervention · l'echelle des chances ─────────── */


/* ─────────── CAP co-intervention · le garage et sa goulotte ─────────── */


/* ═══════════ CAP · cours V2, séquences 5, 6 et 7 — lot A ═══════════ */

/* ─────────── CAP · deux échelles de température ─────────── */


/* ─────────── CAP · la chaleur va du chaud vers le froid ─────────── */


/* ─────────── CAP · isoler ralentit la perte ─────────── */


/* ─────────── CAP · les angles depuis la normale ─────────── */


/* ─────────── CAP · un pas de côté ─────────── */


/* ─────────── CAP · réflexion ou réfraction ─────────── */


/* ─────────── CAP · grave ou aigu, fort ou faible ─────────── */


/* ─────────── CAP · trois décibels de plus, la moitié du temps ─────────── */


/* ─────────── CAP · le casque fermé dans le métro ─────────── */


/* ═══════════════════════════════════════════════════════════════════
   CAP · co-intervention, sequences 4 a 7 (creneaux J11 a J20)
   Lot de schemas a verser dans kit.js, apres les schemas CAP existants.
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────── CAP co-int · S4 · la tension est le coefficient ─────────── */


/* ─────────── CAP co-int · S4 · une question, trois reponses ─────────── */


/* ─────────── CAP co-int · S5 · l'infrarouge lit une surface ─────────── */


/* ─────────── CAP co-int · S5 · deux temperatures qui se rejoignent ─────────── */


/* ─────────── CAP co-int · S5 · image ou antecedent : le geste ─────────── */


/* ─────────── CAP co-int · S6 · le rayon qui rebondit, le rayon qui plie ─────────── */


/* ─────────── CAP co-int · S6 · le spectre et ses deux voisins invisibles ─────────── */


/* ─────────── CAP co-int · S6 · trois lampes sur un ecran ─────────── */


/* ─────────── CAP co-int · S7 · grave ou aigu : compter les vibrations ─────────── */


/* ─────────── CAP co-int · S7 · ou agit chaque protection ─────────── */


/* ─────────── CAP co-int · S7 · la moyenne egalise ─────────── */


/* --------- dispersion d'une serie de releves ---------
   Ajoute le 3 septembre 2026, sequence 1 de maths-PC. C'est la statistique
   descriptive du CCF de mathematiques, sur des donnees de chaufferie. */
OUTILS.dispersion={
  titre:"Moyenne, étendue, écart-type",
  intro:"Entrez une série de relevés, séparés par des espaces ou des virgules. "+
        "Les séries proposées viennent d'installations voisines de celles du cours, "+
        "jamais des activités elles-mêmes.",
  monte:function(d){
    var st={txt:"62,4 62,1 62,6 62,3 62,5 62,2 62,4 62,7 62,3 62,5",cons:62.5,tol:0.5};
    var g=E("div",{"class":"g2"});
    var col1=E("div"),col2=E("div");

    var seg=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"});
    /* chaque serie emporte sa consigne et sa tolerance : sans cela l'outil
       compare des releves a 62 degres a une consigne restee a 45. */
    [["Départ chaufferie","62,4 62,1 62,6 62,3 62,5 62,2 62,4 62,7 62,3 62,5",62.5,0.5],
     ["Régulation A","44,8 45,2 44,9 45,1 45,0 44,9 45,1 45,0",45,0.5],
     ["Régulation B","43,5 46,4 44,2 45,8 45,0 44,1 46,2 44,8",45,0.5],
     ["Débit d'un circuit","2,42 2,38 2,45 2,40 2,44 2,37",2.4,0.05]
    ].forEach(function(o){
      var b=E("button",{"class":"bt",type:"button"},o[0]);
      b.addEventListener("click",function(){
        st.txt=o[1];st.cons=o[2];st.tol=o[3];
        zone.value=o[1];curC.value=o[2];curT.value=o[3];calc();});
      seg.appendChild(b);
    });
    col1.appendChild(seg);

    var zone=E("textarea",{rows:"3",
      style:"width:100%;font-size:15px;padding:8px;border-radius:6px;"+
            "border:1px solid var(--trait);background:var(--carte);color:inherit"});
    zone.value=st.txt;
    zone.addEventListener("input",function(){st.txt=this.value;calc();});
    col1.appendChild(zone);

    function champ(lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");
      c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:st[cle]});
      i.addEventListener("input",function(){st[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);col1.appendChild(c);
      var f=function(){v.textContent=unite+frs(st[cle],dec);};
      f.input=i;return f;
    }
    var mC=champ("Valeur de consigne","cons",0,100,0.1,1,"");
    var mT=champ("Tolérance acceptée","tol",0.05,5,0.05,2,"± ");
    var curC=mC.input, curT=mT.input;

    var res=E("div",{"class":"res"});col2.appendChild(res);
    var boite=E("div",{style:"margin-top:12px"});col2.appendChild(boite);
    var note=E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},"");
    col2.appendChild(note);

    function lire(){
      return st.txt.replace(/,(?=[0-9])/g,".").split(/[^0-9.+-]+/)
             .filter(function(x){return x!==""&&isFinite(parseFloat(x));})
             .map(parseFloat);
    }
    function calc(){
      mC();mT();
      var v=lire(),n=v.length;
      if(n<2){
        res.innerHTML="<div class='gros'><span><b>Série trop courte</b>"+
          "<span>il en faut deux</span></span></div>";
        boite.innerHTML="";note.textContent="";return;
      }
      var som=0;v.forEach(function(x){som+=x;});
      var moy=som/n,mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),c2=0;
      v.forEach(function(x){c2+=(x-moy)*(x-moy);});
      var sn=Math.sqrt(c2/n), sn1=Math.sqrt(c2/(n-1));
      var hors=v.filter(function(x){return Math.abs(x-st.cons)>st.tol;}).length;
      res.innerHTML=
        "<div class='gros'><span><b>Moyenne</b><span>"+frs(moy,3)+"</span></span>"+
        "<span><b>Étendue</b><span>"+frs(mx-mn,3)+"</span></span></div>"+
        "<div class='gros'><span><b>sigma n</b><span>"+frs(sn,3)+"</span></span>"+
        "<span><b>sigma n−1 — expérimental</b><span>"+frs(sn1,3)+"</span></span></div>";
      var W=360,H=74,X0=14,X1=W-14,lo=Math.min(mn,st.cons-st.tol),
          hi=Math.max(mx,st.cons+st.tol),et=(hi-lo)||1;
      lo-=et*0.12;hi+=et*0.12;
      function px(x){return X0+(X1-X0)*(x-lo)/(hi-lo);}
      var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
        "aria-label":"nuage des relevés"});
      svg.appendChild(S("rect",{x:px(st.cons-st.tol),y:8,
        width:px(st.cons+st.tol)-px(st.cons-st.tol),height:44,
        fill:V("trait"),opacity:"0.14"}));
      svg.appendChild(S("line",{x1:X0,y1:56,x2:X1,y2:56,stroke:V("trait"),
        "stroke-width":"1.5"}));
      svg.appendChild(S("line",{x1:px(moy),y1:6,x2:px(moy),y2:60,stroke:V("chaud"),
        "stroke-width":"2"}));
      var vus={};
      v.forEach(function(x){
        var k=x.toFixed(4),m=vus[k]||0;vus[k]=m+1;
        svg.appendChild(S("circle",{cx:px(x),cy:48-12*m,r:4.5,fill:V("froid")}));
      });
      svg.appendChild(S("text",{x:px(moy),y:70,"text-anchor":"middle","class":"s-pet"},
        "moyenne"));
      boite.innerHTML="";boite.appendChild(svg);
      note.innerHTML="<b>"+n+" relevés</b>. L'écart-type expérimental est le "+
        "<b>sigma n−1</b> : c'est celui qui compte sur un échantillon de mesures. "+
        (hors?("<b>"+hors+"</b> relevé"+(hors>1?"s sortent":" sort")+
               " de la tolérance."):"Aucun relevé ne sort de la tolérance.");
    }
    g.appendChild(col1);g.appendChild(col2);d.appendChild(g);
    calc();
  }
};

/* ═══════════════════════════════════════════════════ montage */
/* ═══════════ OUTILS DE DOMOTIQUE, 1re année (16 septembre 2026) ═══════════
   Chaque outil ci-dessous suit le patron du kit : OUTILS["nom"]={titre, intro,
   monte(d)}. Les deux repères qui suivent servent d'ancres d'insertion. */
/* ═══════════ réseau et bus : quatre outils de domotique 1re année ═══════════
   ligne-knx (A1, A4, A5, B4), adresses-groupe (A11), plan-ip (A6) et
   budget-poe (A6, A8). Les aides communes sont préfixées rb pour ne pas entrer
   en collision avec le reste du kit. Même patron que partout : titre, intro,
   monte(d). Rien n'est enregistré, rien n'est chargé. */
function rbChapeau(txt){
  return E("div",{style:"font-family:'Bricolage Grotesque',sans-serif;font-size:11px;"+
    "font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
    "margin:12px 0 6px"},txt);
}
/* ok vaut true, false, ou null quand la règle ne peut pas être tranchée */
function rbVerdict(ok,txt){
  var c=ok===null?"encre2":(ok?"vert":"chaud");
  var m=ok===null?"à vérifier":(ok?"conforme":"non conforme");
  return "<span style='color:var(--"+c+");font-weight:600;white-space:nowrap'>"+m+"</span>"+
    (txt?"<br><span style='font-size:13px;color:var(--encre2)'>"+txt+"</span>":"");
}
/* lignes : [règle, valeur, limite, ok, pourquoi] */
function rbTable(lignes){
  var h="<table style='margin:12px 0 0;font-size:14px'><thead><tr><th>Règle</th><th>Valeur</th>"+
        "<th>Limite</th><th>Verdict</th></tr></thead><tbody>";
  lignes.forEach(function(l){
    h+="<tr><td>"+l[0]+"</td><td class='mono' style='white-space:nowrap'>"+l[1]+
       "</td><td style='white-space:nowrap'>"+l[2]+"</td><td>"+rbVerdict(l[3],l[4]||"")+"</td></tr>";});
  return h+"</tbody></table>";
}
/* une rangée de boutons dont un seul est enfoncé : .bt, et .p pour l'actif */
function rbBoutons(par,opts,etat,cle,calc){
  var w=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px"}),bs=[];
  opts.forEach(function(o){
    var b=E("button",{type:"button","class":"bt"+(etat[cle]===o[0]?" p":"")},o[1]);
    b.addEventListener("click",function(){
      etat[cle]=o[0];
      bs.forEach(function(x,i){x.className="bt"+(opts[i][0]===o[0]?" p":"");});
      calc();});
    bs.push(b);w.appendChild(b);
  });
  par.appendChild(w);return w;
}
function rbNombre(par,lab,etat,cle,min,max,pas,unite,calc){
  var w=E("div",{"class":"champ"});
  w.appendChild(E("label",{},lab));
  var s=E("span",{"class":"v"});
  var i=E("input",{type:"number",min:min,max:max,step:pas,value:etat[cle]});
  i.addEventListener("input",function(){
    var v=parseFloat(String(this.value).replace(",","."));
    if(isFinite(v)){etat[cle]=v;calc();}});
  s.appendChild(i);
  if(unite)s.appendChild(E("span",{style:"margin-left:6px;color:var(--encre2);font-size:13px;"+
    "font-weight:400"},unite));
  w.appendChild(s);par.appendChild(w);return i;
}
function rbTexte(par,lab,etat,cle,calc,largeur){
  var w=E("div",{"class":"champ"});
  w.appendChild(E("label",{},lab));
  var s=E("span",{"class":"v"});
  var i=E("input",{type:"text",value:etat[cle],spellcheck:"false",autocomplete:"off",
    inputmode:"decimal",
    style:"font-family:'IBM Plex Mono',monospace;font-size:14px;padding:5px 7px;"+
          "border:1px solid var(--trait);border-radius:var(--r);background:var(--carte);"+
          "color:var(--encre);width:"+(largeur||150)+"px;text-align:right"});
  i.addEventListener("input",function(){etat[cle]=this.value;calc();});
  s.appendChild(i);w.appendChild(s);par.appendChild(w);return i;
}
var rbSel="width:100%;font:inherit;font-size:14px;padding:7px;border-radius:var(--r);"+
          "border:1px solid var(--trait);background:var(--carte);color:var(--encre)";

/* ─────────── 1. une ligne KNX TP1 ───────────
   Les trois longueurs, les 64 participants, le calibre, et la chute de tension
   du cours : ΔU = ½ r I L pour des participants répartis. La ligne se décrit
   soit par ses trois longueurs, soit tronçon par tronçon en ligne droite. */


/* ─────────── 2. le mini-projet KNX d'une salle : adresses de groupe ───────────
   Six participants, sept adresses. On émet, on regarde qui réagit. Le
   pré-actionneur renvoie l'état de sa sortie, le variateur la valeur atteinte :
   la commande et l'état sont deux adresses, et c'est ce que l'outil fait voir. */


/* ─────────── 3. adresse IPv4 et masque ───────────
   Tout est fait en entiers non signés (>>> 0) : les opérateurs binaires de
   JavaScript travaillent en 32 bits signés, et 192.x.x.x est négatif sans cela. */


/* ─────────── 4. le budget PoE d'un commutateur ───────────
   Deux vérifications, port par port puis au total, et la chute dans le câble :
   la puissance demandée au port est celle de l'appareil plus la perte Joule,
   avec le courant qui laisse cette puissance à l'appareil. */

/* === OUTILS DOMOTIQUE : réseau et bus === */

/* ═══════════════════════════════════════════ LE BILAN D'UNE LIAISON OPTIQUE
   Seances A4 et A8. Le budget d'un module est l'ecart entre sa puissance emise
   minimale et la sensibilite de son recepteur ; les pertes de la liaison
   s'additionnent, et ce qui reste est la marge. Les valeurs sont celles du
   polycopie : OM3 3,5 dB/km, OS2 0,4 dB/km, 0,75 dB par connexion, 0,3 dB par
   epissure — et la liaison du gymnase, 380 m, deux connexions, deux epissures.
   Les budgets typiques sont ceux des modules IEEE 802.3 : SX 7,5 dB, LX 8 dB,
   10G-SR 2,6 dB, 10G-LR 6,2 dB. */


/* ═══════════════════════════════════════ CE QUE PESE UN APPEL, ET COMBIEN EN PASSENT
   Seance A9. Bloc 1 : le debit d'un appel dans un sens, D = R + 8·H/T — le
   codec, la duree du paquet, et le niveau ou l'on compte les en-tetes (40 o
   pour IP+UDP+RTP, 58 o avec la trame Ethernet, 62 o avec l'etiquette VLAN).
   Bloc 2 : la loi d'Erlang B, la probabilite qu'un appel trouve tous les
   canaux occupes, par la recurrence B(0)=1, B(k)=A·B(k-1)/(k+A·B(k-1)).
   Verifie en Python : A = 4,8 E et N = 11 donnent B = 0,645 %. */
function erlangB(A,N){
  var B=1;
  for(var k=1;k<=N;k++)B=A*B/(k+A*B);
  return B;
}
function canauxPour(A,cible){
  for(var n=1;n<=400;n++)if(erlangB(A,n)<=cible)return n;
  return NaN;
}


/* ═══════════════════════════════════════════ LA CHAINE FONCTIONNELLE
   Seances A1, A3 et B3. Deux jeux. Le premier range douze constituants tires
   au sort dans six familles ; il dit juste ou faux et rappelle la regle de la
   famille choisie, jamais la bonne case. Le second fait construire les deux
   chaines d'une fonction — acquerir, traiter, communiquer ; alimenter,
   distribuer, convertir, transmettre — et dit ou elles se rencontrent.
   Le vocabulaire est celui du referentiel et du corrige de la seance A3 :
   un module de sortie est un PRE-actionneur, le programme d'application
   traite, le bus communique, le feu clignotant du portail communique aussi.
   L'alimentation du bus est rangee dans « reseau » : le polycopie de la
   semaine 1, qui n'a pas cette case, la met dans « aucune ». */
var FAMILLES_CHAINE=[
  ["capteur","Capteur ou organe de commande",
   "Un capteur ou un organe de commande <b>acquiert</b> : il produit une information, "+
   "grandeur mesurée ou ordre donné par l'occupant, et ne commute aucune puissance."],
  ["pre","Pré-actionneur",
   "Le pré-actionneur reçoit un ordre en petite puissance et établit ou coupe la puissance : "+
   "<b>il est traversé par la puissance sans produire d'effet</b> dans le bâtiment."],
  ["act","Actionneur",
   "L'actionneur <b>convertit l'énergie en effet</b> dans le bâtiment : lumière, mouvement, "+
   "chaleur, ouverture, son."],
  ["centrale","Centrale",
   "La centrale <b>traite</b> : elle reçoit les informations, décide et envoie les ordres. "+
   "En KNX, aucun appareil ne porte ce nom : la fonction traiter est répartie dans les participants."],
  ["reseau","Réseau",
   "Le réseau <b>relie et transporte</b> : la ligne et son alimentation, les coupleurs, les "+
   "commutateurs, les passerelles. Il ne décide de rien et ne fait rien agir."],
  ["super","Supervision",
   "La supervision <b>regarde l'ensemble</b> : elle affiche les états, archive et alarme, "+
   "depuis un poste, un serveur ou une application. Elle ne fait pas agir directement."]
];
var BANQUE_CONSTITUANTS=[
  ["Détecteur de présence","capteur"],
  ["Télérupteur","pre"],
  ["Luminaire LED","act"],
  ["Poussoir bus","capteur","Il donne un ordre : un organe de commande, raccordé au bus."],
  ["Contacteur de chauffage","pre"],
  ["Moteur de volet roulant","act"],
  ["Sonde de température d'ambiance","capteur"],
  ["Variateur universel","pre","Il règle la puissance qui le traverse ; la lumière, c'est le luminaire qui la produit."],
  ["Alimentation bus 640 mA","reseau","Elle n'alimente aucun actionneur : elle appartient à l'infrastructure du bus, avec la ligne et ses coupleurs. Sur le polycopié de la semaine 1, sans case « réseau », elle allait dans « aucune »."],
  ["Lecteur de badge","capteur","Il acquiert une identité et la transmet ; il ne décide pas d'ouvrir."],
  ["Gâche électrique","act"],
  ["Coupleur de ligne","reseau"],
  ["Écran tactile mural","capteur","Il donne des ordres depuis la pièce ; il affiche aussi des états, mais il ne surveille pas le bâtiment."],
  ["Passerelle KNX/IP","reseau"],
  ["Caméra IP","capteur","Elle acquiert une image : un capteur, même raccordé en IP."],
  ["Sirène","act"],
  ["Centrale d'alarme intrusion","centrale"],
  ["Compteur d'énergie communicant","capteur","Il mesure une énergie et la communique : un capteur."],
  ["Commutateur Ethernet","reseau"],
  ["Automate de GTB","centrale"],
  ["Poste de supervision GTB","super"],
  ["Module de sortie KNX 4 relais","pre","Le fabricant l'appelle « actionneur » ; le référentiel, non : l'actionneur est le luminaire ou le moteur qu'il commande."],
  ["Interrupteur crépusculaire","capteur"],
  ["Anémomètre","capteur"],
  ["Tête thermoélectrique de radiateur","act","Elle ouvre la vanne : l'effet est un débit d'eau chaude dans le radiateur."],
  ["Relais 24 V","pre"],
  ["Routeur","reseau"],
  ["Application de pilotage sur smartphone","super"],
  ["Câble de bus TP1","reseau"],
  ["Contacteur jour-nuit","pre"],
  ["Moteur de portail","act"],
  ["Cellule photoélectrique","capteur"],
  ["Carte électronique du portail","centrale","Elle décide à partir des cellules et de la télécommande ; ses relais de puissance, eux, sont des pré-actionneurs."],
  ["Télécommande radio","capteur","Un organe de commande sans fil : elle donne l'ordre."],
  ["Serveur de visualisation KNX","super"],
  ["Détecteur de fumée","capteur"],
  ["Centrale SSI","centrale"],
  ["Enregistreur vidéo NVR","super","Il archive et affiche les images : supervision."],
  ["Électrovanne d'arrosage","act"]
];
var FONCTIONS_DEUX_CHAINES=[
  {nom:"Allumer l'estrade depuis un poussoir bus",
   info:["Poussoir bus","Programme d'application du module de sortie","Télégrammes sur le bus KNX"],
   energie:["Réseau 230 V et son disjoncteur","Relais du module de sortie","Luminaires LED"],
   effet:"l'estrade éclairée"},
  {nom:"Remonter les volets quand le vent forcit",
   info:["Anémomètre","Programme d'application du module volets","Télégrammes sur le bus KNX"],
   energie:["Réseau 230 V et son disjoncteur","Relais de montée et de descente du module volets",
            "Moteurs tubulaires","Réducteur et tube d'enroulement"],
   effet:"les volets remontés"},
  {nom:"Fermer le portail du parking",
   info:["Cellules photoélectriques","Carte électronique de commande","Feu clignotant"],
   energie:["Disjoncteur et arrivée 230 V","Relais de puissance de la carte","Moteur électrique",
            "Réducteur, pignon et crémaillère"],
   effet:"le portail fermé"}
];


/* ═══════════════════════════════════════════ LA CARTE DU REFERENTIEL
   Fiche referentiel du site de domotique. Le site ecrit referentiel.js :
   window.REFERENTIEL = { savoirs:[{code,intitule,niveau,famille}],
                          pages:[{id,url,titre,groupe,savoirs:[codes],
                                  exos:[{id,savoir,type}]}] }.
   L'outil le croise avec les marques du navigateur — fed.<site>.lu, un objet
   id de page → horodatage, et fed.<site>.exo, un objet id d'exercice →
   « juste » ou un autre etat — et rend une table par famille : niveau DBC,
   pages qui enseignent le savoir, exercices justes, couverture. Comme la
   carte des prerequis, il ne vit que sur le site : en page autonome, il le
   dit et s'arrete. Rien ne sort du navigateur. */


/* === OUTILS DOMOTIQUE : liaisons, mesures, référentiel === */

/* ───────────────────────────────── montage des outils */
[].forEach.call(document.querySelectorAll(".outil[data-outil]"),function(el){
  var o=OUTILS[el.getAttribute("data-outil")];
  if(!o){el.innerHTML="<div class='dedans'>Outil inconnu : "+
    el.getAttribute("data-outil")+"</div>";return;}
  el.innerHTML="";
  var t=E("div",{"class":"tete-outil"});
  t.appendChild(E("p",{"class":"k"},"Outil"));
  t.appendChild(E("h4",{},o.titre));
  if(o.chaine)t.appendChild(E("p",{"class":"chaine"},"↳ "+o.chaine));
  t.appendChild(E("p",{},o.intro));
  el.appendChild(t);
  var d=E("div",{"class":"dedans"});
  el.appendChild(d);
  o.monte(d, el);
});

/* les schemas se montent apres les outils : ils lisent l'etat partage */
[].forEach.call(document.querySelectorAll("[data-schema]"),function(el){
  var f=SCHEMAS[el.getAttribute("data-schema")];
  if(!f){el.innerHTML="Schéma inconnu : "+el.getAttribute("data-schema");return;}
  f(el);
});

/* ─────────────────────────────────────────────── le bilan d'une epreuve
   Sur une page qui se declare « epreuve: oui », un bandeau compte ce qui est
   fait. Il ne donne AUCUNE reponse — juste combien de questions ont ete
   validees et combien restent. Le compte se refait a chaque evenement « exo »
   emis par exoNote, et au chargement, car les reponses precedentes sont dans
   le localStorage de l'appareil.
   Rien ici ne remonte nulle part : c'est le meme stockage que le suivi de
   lecture, et il ne sort pas du navigateur. */
(function(){
  var page=document.querySelector('.page[data-epreuve]');
  if(!page)return;
  var exos=[].slice.call(document.querySelectorAll(".exo"));
  if(!exos.length)return;

  var bandeau=E("div",{"class":"bilan-epreuve",id:"bilan-epreuve"});
  var jauge=E("i",{}); jauge.appendChild(E("b",{}));
  var texte=E("span",{"class":"compte"},"");
  bandeau.appendChild(jauge); bandeau.appendChild(texte);

  /* pose juste avant le premier exercice : au-dessus du sujet, pas en tete
     de page ou il serait lu avant meme d'avoir vu une question */
  var premier=exos[0], hote=premier;
  while(hote.parentNode&&hote.parentNode!==page)hote=hote.parentNode;
  page.insertBefore(bandeau,hote);

  function refaire(){
    var t=exoLu(),justes=0,vus=0;
    exos.forEach(function(ex){
      var e=t[ex.getAttribute("data-exo")];
      if(e==="juste")justes++; else if(e)vus++;
    });
    var reste=exos.length-justes-vus;
    jauge.firstChild.style.width=Math.round(100*justes/exos.length)+"%";
    texte.textContent=exos.length+" questions · "+justes+" juste"+(justes>1?"s":"")
      +(vus?" · "+vus+" à revoir":"")+(reste?" · "+reste+" non traitée"
      +(reste>1?"s":""):" · terminé");
  }
  document.addEventListener("exo",refaire);
  refaire();
})();

/* le composeur de paroi peut être monté après le bilan : on repasse une fois */
if(OUTILS.bilan._recalc)OUTILS.bilan._recalc();
})();
