document.querySelector('#expand').addEventListener('click',()=>document.querySelectorAll('details').forEach(d=>d.open=true));
document.querySelector('#collapse').addEventListener('click',()=>document.querySelectorAll('details').forEach(d=>d.open=false));
function reveal(){const d=document.getElementById(location.hash.slice(1));if(d&&d.tagName==='DETAILS')d.open=true;}
addEventListener('hashchange',reveal);reveal();
addEventListener('beforeprint',()=>document.querySelectorAll('details').forEach(d=>d.open=true));
