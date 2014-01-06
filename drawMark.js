var mapRaphael = {
    paper: '',
    clicktimefn: null, //区分单击拖动与双击打开对话框
    init: function() {
        this.paper = Raphael('mapArea', 700, 600);
        return this.paper;
    },

    drawDevice: function(x, y) {
        var devicePoint = this.paper.circle(x, y, 3);
        devicePoint.attr('fill', 'red');
        //Event
        devicePoint.hover(function() {
                this.attr('fill', 'yellow');
            }, function() {
                this.attr('fill', 'red');
            }
        );

        devicePoint.click(function() {
            if (!popbox.showFlag && (popbox.isTriggerClick === 1)) {
                popbox.showPopbox(hazard.initDeviceInfo.zz);
                popbox.showFlag = true;
            }
            popbox.isTriggerClick = 1;
        });

        devicePoint.dblclick(function() {
            deviceInfo.showDeviceDialog(Common.clone(hazard.initDeviceInfo));
        });

        //TODO:devicePoint.x,devicePoint.y
        devicePoint.drag(
            function(dx, dy) {
                var cx1 = devicePoint.x + dx,
                    cy1 = devicePoint.y + dy,
                    mapWidth = hazard.backgroundImage.attr('width'),
                    mapHeight = hazard.backgroundImage.attr('height');

                if (popbox.showFlag) {
                    popbox.hidePopbox();
                }

                if (cx1 <= 0 || cy1 <= 0 || cx1 >= mapWidth || cy1 >= mapHeight) {
                    return;
                }
                this.attr({
                    cx: cx1,
                    cy: cy1
                });
            },
            function() {
                devicePoint.x = this.attr('cx');
                devicePoint.y = this.attr('cy');
            },
            function() {
                var cx = this.attr('cx'),
                    cy = this.attr('cy'),
                    sendingParam = {},
                    deviceInfo = {};
                //忽略微小移动
                if (Math.sqrt(Math.pow(devicePoint.x - cx, 2) +
                    Math.pow(devicePoint.y - cy, 2)) < 1) {
                    return;
                }

                deviceInfo['id'] = hazard.deviceId;
                deviceInfo['x'] = cx / hazard.proportion;
                deviceInfo['y'] = cy / hazard.proportion;
                sendingParam = deviceInfo;
                $.post('/api/professional/hazard/device/editDevice', sendingParam, function(data) {
                    if (data.success) {
                        hazard.initDeviceInfo.zz.x = deviceInfo['x'];
                        hazard.initDeviceInfo.zz.y = deviceInfo['y'];
                    } else {
                        $.alert(data.error);
                        return false;
                    }
                });

                if (hazard.calcstatus === 2) {
                    modefied.changeCalcStatus();
                }
                popbox.isTriggerClick = 0;
                if (popbox.showFlag) {
                    popbox.showDeviceInfo.x = deviceInfo['x'];
                    popbox.showDeviceInfo.y = deviceInfo['y'];
                    if (typeof(popbox.showDeviceInfo) !== 'undefined') {
                        popbox.showPopbox(popbox.showDeviceInfo);
                    }
                }
            }
        );
        return devicePoint;
    },

    _draMark: function(marks, deviceCor, simulationRaphael) {
        var mapWidth = hazard.backgroundImage.attr('width'),
            mapHeight = hazard.backgroundImage.attr('height'),
            marksLen = marks.length, mark_i,
            initAngle = 0, angleIncrement = 60, curAngle = initAngle, marksAngle = [];
        
        //judge whether the mark is out of limit of the map
        function  isOutOfLimit(angle, radius) {
            var pointX, pointY;
            //
            pointX = deviceCor.x + radius * Math.cos(angle * (Math.PI / 180));
            pointY = deviceCor.y - radius * Math.sin(angle * (Math.PI / 180));
            if (pointX < 0 || pointX > mapWidth || pointY < 0 || pointY > mapHeight) {
                return true;
            }
            return false;
        }
        //no marks with same angle
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
            var startX = deviceCor.x + 3,
                endX = deviceCor.x + curMark.r,
                path = 'M' + startX + ',' + deviceCor.y + 'L' + endX + ',' + deviceCor.y,
                textCor = {},
                textRotateAngle,
                lineRotateAngle;

            lineRotateAngle = - curAngle;

            simulationRaphael.push(mapRaphael.paper.path(path).attr({
                'stroke': curMark.c,
                'stroke-width': 1,
                'arrow-end': 'open'
            }).transform('r' + lineRotateAngle + ',' + deviceCor.x + ',' + deviceCor.y));
            //text
            
            if ((curAngle >= 0 && curAngle <= 90) || (curAngle >= 270 && curAngle <= 360)) {
                textCor.x = (startX + endX) / 2;
                textCor.y = deviceCor.y + 10;
                textRotateAngle = -curAngle;
            } else {
                textCor.x = (startX + endX - 2 * curMark.r) / 2;
                textCor.y = deviceCor.y + 10;
                textRotateAngle = 180 - curAngle;
            }
            
            simulationRaphael.push(mapRaphael.paper.text(textCor.x, textCor.y,
                curMark.rr.toFixed(2)).attr({
                    'stroke': curMark.c,
                    'font-weight': 0.5
                }).transform('r' + textRotateAngle + ',' + deviceCor.x + ',' + deviceCor.y));
        }
        //
        for (mark_i = 0 ; mark_i < marksLen ; mark_i++) {
            while (true) {
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
                    curAngle = initAngle;
                    angleIncrement = angleIncrement / 2;
                }
            }
            mark(marks[mark_i], curAngle);
            curAngle = initAngle;
        }
    },

    drawHazardSimulate: function(acRecords, isLeak) {
        var colorSet = {},
            pOfp = hazard.proportion / hazard.latestCalcProportion,
            scale = $('#scale').val() * 1,
            simulationRaphael = [],
            device_x = hazard.deviceRaphael.attr('cx'),
            device_y = hazard.deviceRaphael.attr('cy'),
            i, spreadCircle, scLength,
            zj_x = acRecords.hfxzdzyjldyx / scale,
            zy_x = acRecords.xfxzdjl / scale,
            zy_y = acRecords.hfxzdjl / scale,
            simulateRadius, marks = [];
        colorSet.sw = $('#swys').spectrum('get').toHexString();
        colorSet.zs = $('#zsys').spectrum('get').toHexString();
        colorSet.qs = $('#qsys').spectrum('get').toHexString();
        colorSet.ccss = $('#ccssys').spectrum('get').toHexString();
        colorSet.xlzd = $('#xlzdys').spectrum('get').toHexString();
        colorSet.rb = $('#rbys').spectrum('get').toHexString();
        if (isLeak === true) {
            if (acRecords.leakyType === 1) {
                //中毒
                scLength = acRecords.spreadCirclesToxic.length;
                for (i = 0 ; i < scLength ; i++) {
                    spreadCircle = acRecords.spreadCirclesToxic[i];
                    simulationRaphael.push(this.paper.circle(device_x + (spreadCircle.x / scale),
                    device_y, spreadCircle.radius / scale).attr({'stroke': colorSet.xlzd,
                    'stroke-width': 2}).transform('r' + acRecords.routeAngle + ',' + device_x +
                    ',' + device_y));
                }

                //燃爆
                if (typeof(acRecords.spreadCirclesExplo) !== typeof(undefined)) {
                    scLength = acRecords.spreadCirclesExplo.length;
                    for (i = 0 ; i < scLength ; i++) {
                        spreadCircle = acRecords.spreadCirclesExplo[i];
                        simulationRaphael.push(this.paper.circle(device_x + (spreadCircle.x / scale),
                        device_y, spreadCircle.radius / scale).attr({'stroke': colorSet.rb,
                        'stroke-width': 2}).transform('r' + acRecords.routeAngle + ',' + device_x +
                        ',' + device_y));
                    }
                }
            } else if (acRecords.leakyType === 2) {
                simulationRaphael.push(this.paper.path('M' + (device_x + zj_x) + ',' + (device_y - zy_y) +
                    ' A' + (zy_x - zj_x) + ',' + zy_y + ' 0 0,1 ' + (device_x + zj_x) + ',' +
                    (device_y + zy_y)).attr({'stroke': colorSet.xlzd, 'stroke-width': 2}).transform('r' +
                    acRecords.routeAngle + ',' + device_x + ',' + device_y));
                simulationRaphael.push(this.paper.path('M' + (device_x + zj_x) + ',' + (device_y - zy_y) +
                    ' A' + zj_x + ',' + zy_y + ' 0 0,0 ' + (device_x + zj_x) + ',' + (device_y +
                    zy_y)).attr({'stroke': colorSet.xlzd, 'stroke-width': 2}).transform('r' +
                    acRecords.routeAngle + ',' + device_x + ',' + device_y));

                //燃爆
                if (typeof(acRecords.hfxrbzyjldyx) !== typeof(undefined)) {
                    zj_x = acRecords.hfxrbzyjldyx / scale;
                    zy_x = acRecords.xfxrbjl / scale;
                    zy_y = acRecords.hfxrbjl / scale;
    
                    simulationRaphael.push(this.paper.path('M' + (device_x + zj_x) + ',' + (device_y - zy_y) +
                        ' A' + (zy_x - zj_x) + ',' + zy_y + ' 0 0,1 ' + (device_x + zj_x) + ',' + (device_y +
                        zy_y)).attr({'stroke': colorSet.rb, 'stroke-width': 2}).transform('r' +
                        acRecords.routeAngle + ',' + device_x + ',' + device_y));
                    simulationRaphael.push(this.paper.path('M' + (device_x + zj_x) + ',' + (device_y - zy_y) +
                        ' A' + zj_x + ',' + zy_y + ' 0 0,0 ' + (device_x + zj_x) + ',' + (device_y +
                        zy_y)).attr({'stroke': colorSet.rb, 'stroke-width': 2}).transform('r' +
                        acRecords.routeAngle + ',' + device_x + ',' + device_y));
                }
            }
        } else {
            if (typeof(acRecords.ccssbj) !== typeof(undefined)) {
                simulateRadius = acRecords.ccssbj * pOfp;
                simulationRaphael.push(this.paper.circle(device_x, device_y,
                    simulateRadius).attr({'stroke': colorSet.ccss, 'stroke-width': 2}));
                //
                marks.push({
                    'r': simulateRadius,
                    'rr': acRecords.ccssbj,
                    'c': colorSet.ccss
                });
            }
            if (typeof(acRecords.qsbj) !== typeof(undefined)) {
                simulateRadius = acRecords.qsbj * pOfp;
                simulationRaphael.push(this.paper.circle(device_x, device_y,
                    simulateRadius).attr({'stroke': colorSet.qs, 'stroke-width': 2}));
                //
                marks.push({
                    'r': simulateRadius,
                    'rr': acRecords.qsbj,
                    'c': colorSet.qs
                });
            }
            if (typeof(acRecords.zsbj) !== typeof(undefined)) {
                simulateRadius = acRecords.zsbj * pOfp;
                simulationRaphael.push(this.paper.circle(device_x, device_y,
                    simulateRadius).attr({'stroke': colorSet.zs, 'stroke-width': 2}));
                //
                marks.push({
                    'r': simulateRadius,
                    'rr': acRecords.zsbj,
                    'c': colorSet.zs
                });
            }
            if (typeof(acRecords.swbj) !== typeof(undefined)) {
                simulateRadius = acRecords.swbj * pOfp;
                simulationRaphael.push(this.paper.circle(device_x, device_y,
                    simulateRadius).attr({'stroke': colorSet.sw, 'stroke-width': 2}));
                //
                marks.push({
                    'r': simulateRadius,
                    'rr': acRecords.swbj,
                    'c': colorSet.sw
                });
            }
            this._draMark(marks, {'x': device_x, 'y': device_y}, simulationRaphael);
        }

        return simulationRaphael;
    },

    clearSimulationRaphael: function() {
        var i;
        if (hazard.simulationRaphael.length > 0) {
            for (i = 0 ; i < hazard.simulationRaphael.length ; i++) {
                hazard.simulationRaphael[i].remove();
            }
            hazard.simulationRaphael.length = 0;
        }
    },
    getScaleLine: function(startCor, endCor) {
        var scaleLine = this.paper.path('M' + startCor.x + ',' + startCor.y + 'L' + endCor.x + ',' + endCor.y);
        return scaleLine;
    }
};

var windroseRaphael = {
    paper: '',
    init: function() {
        this.paper = Raphael('windRoseShow', 400, 280);
        return this.paper;
    },

    drawBackGround: function() {
        this.paper.circle(200, 140, 120);
        this.paper.path('M80,140L320,140M200,20L200,260' +
            'M284.8656,55.1344L115.1344,224.8656' +
            'M115.1344,55.1344L284.8656,224.8656' +
            'M245.9220,29.1345L154.0780,250.8655' +
            'M154.0780,29.1345L245.9220,250.8655' +
            'M310.8655,94.0780L89.1345,185.9220' +
            'M89.1345,94.0780L310.8655,185.9220');
        this.paper.text(60, 140, '西(W)');
        this.paper.text(340, 140, '东(E)');
        this.paper.text(200, 10, '北(N)');
        this.paper.text(200, 270, '南(S)');
        this.paper.text(314.8656, 50.1344, '北东(NE)');
        this.paper.text(350.8655, 90.0780, '东北东(ENE)');
        this.paper.text(280.9220, 20.1345, '北北东(NNE)');
        this.paper.text(314.8656, 234.8656, '南东(SE)');
        this.paper.text(350.8655, 190.9220, '东南东(ESE)');
        this.paper.text(275.9220, 260.8655, '南南东(SSE)');
        this.paper.text(80.0780, 228.8656, '南西(SW)');
        this.paper.text(43.1345, 187.9220, '西南西(WSW)');
        this.paper.text(130.0780, 260.8655, '南南西(SSW)');
        this.paper.text(80.0780, 50.1344, '西北(WN)');
        this.paper.text(43.1345, 90.0780, '西西北(WWN)');
        this.paper.text(120.0780, 20.1345, '西北北(WNN)');
    },
    drawWindRose: function(windrose, fpfsFlag) {
        var maxFpFs = 0, windOffset = {}, windCordinate = {}, windroseArray = [],
            cos675 = 0.3826834, sin675 = 0.9238795,
            sin45 = 0.707106,
            i, assignMaxLength,
            windroseRaphael;
        windroseArray = [ windrose.n, windrose.nne, windrose.ne, windrose.ene,
                          windrose.e, windrose.ese, windrose.se, windrose.sse,
                          windrose.s, windrose.ssw, windrose.sw, windrose.wsw,
                          windrose.w, windrose.wwn, windrose.wn, windrose.wnn];
        if (fpfsFlag === 'fp') {
            assignMaxLength = 100;
        } else if (fpfsFlag === 'fs') {
            assignMaxLength = 80;
        }

        for (i = 0 ; i < windroseArray.length ; i++) {
            if (windroseArray[i] * 1 > maxFpFs * 1) {  //Attation:确保比较的时候是数字型
                maxFpFs = windroseArray[i];
            }
        }

        //最大风频长度设定为100
        windOffset.n = assignMaxLength * windrose.n / maxFpFs;
        windOffset.nne = assignMaxLength * windrose.nne / maxFpFs;
        windOffset.ne = assignMaxLength * windrose.ne / maxFpFs;
        windOffset.ene = assignMaxLength * windrose.ene / maxFpFs;

        windOffset.e = assignMaxLength * windrose.e / maxFpFs;
        windOffset.ese = assignMaxLength * windrose.ese / maxFpFs;
        windOffset.se = assignMaxLength * windrose.se / maxFpFs;
        windOffset.sse = assignMaxLength * windrose.sse / maxFpFs;

        windOffset.s = assignMaxLength * windrose.s / maxFpFs;
        windOffset.ssw = assignMaxLength * windrose.ssw / maxFpFs;
        windOffset.sw = assignMaxLength * windrose.sw / maxFpFs;
        windOffset.wsw = assignMaxLength * windrose.wsw / maxFpFs;

        windOffset.w = assignMaxLength * windrose.w / maxFpFs;
        windOffset.wwn = assignMaxLength * windrose.wwn / maxFpFs;
        windOffset.wn = assignMaxLength * windrose.wn / maxFpFs;
        windOffset.wnn = assignMaxLength * windrose.wnn / maxFpFs;

        windCordinate.n = {'x': 200, 'y': 140 - windOffset.n};
        windCordinate.wnn = {'x': 200 - windOffset.wnn * cos675, 'y': 140 - windOffset.wnn * sin675};
        windCordinate.wn = {'x': 200 - windOffset.wn * sin45, 'y': 140 - windOffset.wn * sin45};
        windCordinate.wwn = {'x': 200 - windOffset.wwn * sin675, 'y': 140 - windOffset.wwn * cos675};

        windCordinate.w = {'x': 200 - windOffset.w, 'y': 140};
        windCordinate.wsw = {'x': 200 - windOffset.wsw * sin675, 'y': 140 + windOffset.wsw * cos675};
        windCordinate.sw = {'x': 200 - windOffset.sw * sin45, 'y': 140 + windOffset.sw * sin45};
        windCordinate.ssw = {'x': 200 - windOffset.ssw * cos675, 'y': 140 + windOffset.ssw * sin675};

        windCordinate.s = {'x': 200, 'y': 140 + windOffset.s};
        windCordinate.sse = {'x': 200 + windOffset.sse * cos675, 'y': 140 + windOffset.sse * sin675};
        windCordinate.se = {'x': 200 + windOffset.se * sin45, 'y': 140 + windOffset.se * sin45};
        windCordinate.ese = {'x': 200 + windOffset.ese * sin675, 'y': 140 + windOffset.ese * cos675};

        windCordinate.e = {'x': 200 + windOffset.e, 'y': 140};
        windCordinate.ene = {'x': 200 + windOffset.ene * sin675, 'y': 140 - windOffset.ene * cos675};
        windCordinate.ne = {'x': 200 + windOffset.ne * sin45, 'y': 140 - windOffset.ne * sin45};
        windCordinate.nne = {'x': 200 + windOffset.nne * cos675, 'y': 140 - windOffset.nne * sin675};

        windroseRaphael = this.paper.path('M' + windCordinate.n.x + ',' + windCordinate.n.y +
           'L' + windCordinate.wnn.x + ',' + windCordinate.wnn.y +
           'L' + windCordinate.wn.x + ',' + windCordinate.wn.y +
           'L' + windCordinate.wwn.x + ',' + windCordinate.wwn.y +
           'L' + windCordinate.w.x + ',' + windCordinate.w.y +
           'L' + windCordinate.wsw.x + ',' + windCordinate.wsw.y +
           'L' + windCordinate.sw.x + ',' + windCordinate.sw.y +
           'L' + windCordinate.ssw.x + ',' + windCordinate.ssw.y +
           'L' + windCordinate.s.x + ',' + windCordinate.s.y +
           'L' + windCordinate.sse.x + ',' + windCordinate.sse.y +
           'L' + windCordinate.se.x + ',' + windCordinate.se.y +
           'L' + windCordinate.ese.x + ',' + windCordinate.ese.y +
           'L' + windCordinate.e.x + ',' + windCordinate.e.y +
           'L' + windCordinate.ene.x + ',' + windCordinate.ene.y +
           'L' + windCordinate.ne.x + ',' + windCordinate.ne.y +
           'L' + windCordinate.nne.x + ',' + windCordinate.nne.y + 'z').attr('stroke', 'blue');
        
        return windroseRaphael;
    }
};
