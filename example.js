$(function() {
    $('.cs').spectrum({
        preferredFormat: 'hex',
        showInput: true,
        showInitial: true,
        cancelText: '取消',
        chooseText: '确定'
    });
    //init color
    $('#cs1').spectrum('set', 'F00');
    $('#cs2').spectrum('set', 'FF0');
    $('#cs3').spectrum('set', '00F');
    $('#cs4').spectrum('set', '0F0');
    //init raphael paper
    raphaelMark.init();
    //draW center at (500, 500)
    raphaelMark.drawCenter(500, 500);
    //bind click
    $('#simulate').click(function() {
        raphaelMark.drawConcentricCircles();
    });
});