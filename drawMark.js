var raphaelMark = {
    paper: '',
    //init the raphael paper
    init: function() {
        this.paper = Raphael('paper', 1000, 1000);
        return this.paper;
    },

    //draw a filledCircle as the center of the  concentric circles,
    //you can drag it on the map to change its position
    drawCenter: function(x, y) {
        var centerPoint = this.paper.circle(x, y, 3);
        centerPoint.attr('fill', 'red');
        //change the color to yellow when mouse hover
        centerPoint.hover(function() {
                this.attr('fill', 'yellow');
            }, function() {
                this.attr('fill', 'red');
            }
        );

        centerPoint.drag(
            function(dx, dy) {
                var cx1 = centerPoint.x + dx,
                    cy1 = centerPoint.y + dy;

                if (popbox.showFlag) {
                    popbox.hidePopbox();
                }
                //Make sure the centerPoint being dragged in the paper
                if (cx1 <= 0 || cy1 <= 0 || cx1 >= 1000 || cy1 >= 1000) {
                    return;
                }
                this.attr({
                    cx: cx1,
                    cy: cy1
                });
            },
            function() {
                centerPoint.x = this.attr('cx');
                centerPoint.y = this.attr('cy');
            },
            function() {}
        );
        return centerPoint;
    },

    //draw concentric circles
    //Here, I use four assigned radius to draw four circles
    drawConcentricCircles: function() {
        var colorSet = {},
            centerX = hazard.deviceRaphael.attr('cx'),
            centerY = hazard.deviceRaphael.attr('cy'),
            simulateRadius, marks = [];
        colorSet.c1 = $('#c1').spectrum('get').toHexString();
        colorSet.c2 = $('#c2').spectrum('get').toHexString();
        colorSet.c3 = $('#c3').spectrum('get').toHexString();
        colorSet.c4 = $('#c4').spectrum('get').toHexString();
        
        //circle1 radius=20
        simulateRadius = 20;
        this.paper.circle(centerX, centerY, simulateRadius).attr({'stroke': colorSet.c1, 'stroke-width': 2});
        //
        marks.push({
            'r': simulateRadius,
            'info': 'c1',
            'c': colorSet.c1
        });
        //circle2 radius=40
        simulateRadius = 40;
        this.paper.circle(centerX, centerY, simulateRadius).attr({'stroke': colorSet.c2, 'stroke-width': 2});
        //
        marks.push({
            'r': simulateRadius,
            'info': 'c2',
            'c': colorSet.c2
        });
        //circle3 radius=60
        simulateRadius = 60;
        this.paper.circle(centerX, centerY, simulateRadius).attr({'stroke': colorSet.zs, 'stroke-width': 2});
        //
        marks.push({
            'r': simulateRadius,
            'info': acRecords.zsbj,
            'c': colorSet.c3
        });
        //circle4 radius=80
        simulateRadius = 80;
        this.paper.circle(centerX, centerY, simulateRadius).attr({'stroke': colorSet.c4, 'stroke-width': 2});
        //
        marks.push({
            'r': simulateRadius,
            'info': acRecords.swbj,
            'c': colorSet.c4
        });
        
        this._draMark(marks, {'x': centerX, 'y': centerY});
    },

    //draw marks of the concentric circles
    _draMark: function(marks, centerCor) {
        var marksLen = marks.length,
            mark_i,
            initAngle = 0, angleIncrement = 60, curAngle = initAngle, marksAngle = [];
        
        //judge whether the mark is out of limit of the map
        function  isOutOfLimit(angle, radius) {
            var pointX, pointY;
            //
            pointX = centerCor.x + radius * Math.cos(angle * (Math.PI / 180));
            pointY = centerCor.y - radius * Math.sin(angle * (Math.PI / 180));
            if (pointX < 0 || pointX > 1000 || pointY < 0 || pointY > 1000) {
                return true;
            }
            return false;
        }
        //make sure no marks with same angle
        function isSameWithPre(i) {
            var marksAngle_i;
            for (marksAngle_i = i ; marksAngle_i >= 0 ; marksAngle_i--) {
                if (curAngle === marksAngle[marksAngle_i]) {
                    return true;
                }
            }
            return false;
        }
        //draw
        function mark(curMark, curAngle) {
            var startX = centerCor.x + 3,
                endX = centerCor.x + curMark.r,
                path = 'M' + startX + ',' + centerCor.y + 'L' + endX + ',' + centerCor.y,
                textCor = {},
                textRotateAngle,
                lineRotateAngle;

            lineRotateAngle = - curAngle;

            simulationRaphael.push(mapRaphael.paper.path(path).attr({
                'stroke': curMark.c,
                'stroke-width': 1,
                'arrow-end': 'open'
            }).transform('r' + lineRotateAngle + ',' + centerCor.x + ',' + centerCor.y));

            // calc the position of text(info)
            if ((curAngle >= 0 && curAngle <= 90) || (curAngle >= 270 && curAngle <= 360)) {
                textCor.x = (startX + endX) / 2;
                textCor.y = centerCor.y + 10;
                textRotateAngle = -curAngle;
            } else {
                textCor.x = (startX + endX - 2 * curMark.r) / 2;
                textCor.y = centerCor.y + 10;
                textRotateAngle = 180 - curAngle;
            }
            
            simulationRaphael.push(mapRaphael.paper.text(textCor.x, textCor.y,
                curMark.info).attr({
                    'stroke': curMark.c,
                    'font-weight': 0.5
                }).transform('r' + textRotateAngle + ',' + centerCor.x + ',' + centerCor.y));
        }
        //
        for (mark_i = 0 ; mark_i < marksLen ; mark_i++) {
            while (true) {
                //traversal with the initAngle and angleIncrement until back to the start(curAngle equals with initAngle + 360)
                if (curAngle < 360) {
                    if (isSameWithPre(mark_i)) {
                        curAngle = curAngle + angleIncrement;
                        continue;
                    }
                    if (isOutOfLimit(curAngle, marks[mark_i].r)) {
                        curAngle = curAngle + angleIncrement;
                    } else {
                        marksAngle.push(curAngle);
                        break;
                    }
                } else {
                    //have not find a fitted angle this time, so half the angleIncrement and try again
                    curAngle = initAngle;
                    angleIncrement = angleIncrement / 2;
                }
            }
            mark(marks[mark_i], curAngle);
            curAngle = initAngle;
        }
    }
};