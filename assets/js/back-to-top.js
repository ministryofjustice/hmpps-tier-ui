window.addEventListener('scroll', function (){
    var mainNest = document.getElementById('main');
    var backToTop = mainNest.querySelector('#back-to-top');
    var contentLimit = mainNest.querySelector('#assess-protect-add-end');
    var triggerPosition = contentLimit.getBoundingClientRect().bottom + window.scrollY;
    var currentPosition = window.scrollY + window.innerHeight;

    if (currentPosition > triggerPosition){
        backToTop.style.display = 'block';
    } else {
        backToTop.style.display = 'none';
    }
});