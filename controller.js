/*-----------------------------------------------------*/
/*- Wave Artist v.0.0.0.1                 24-feb-2014 -*/
/*- Copyright (c) 2014 L.Yamil Martinez (G+ yamilado) -*/
/*- Licensed under The Artistic License 2.0           -*/
/*-----------------------------------------------------*/

function WAController($scope) {
    //about
    $scope.appName='Wave Artist';
    $scope.appVersion='0.0.0.1';
    $scope.appAuthor='L. Yamil';
    $scope.appContact='G+ yamilado';
    $scope.appWeb='';
    $scope.appEULA='Artistic License 2.0';
    $scope.appComment="Dedicated to my daughter, family and friends for their support. Thanks.";
    //constants
    $scope.showDialog='';
    $scope.num_origin=1;
    $scope.currentAction='';
    $scope.currentMenu='';
    $scope.currentSubMenu='';
    $scope.showSubMenu=false;
    $scope.credits="about";
    $scope.drawInfo="";
    $scope.paused=false;

    var PI=Math.PI; //3.141592;
    $scope.POOL_WIDTH=800;
    $scope.POOL_HEIGHT=550;
    var XMA=799;
    var YMA=549;
    var XYMA=2000; //>sqrt(XMA^2+YMA^2)
    $scope.MAXORIGINS=10;
    
    //prototypes and arrays
    var Dibujo={x1:0,y1:0,x2:0,y2:0,xp:0,yp:0, mouseX:($scope.POOL_WIDTH/2),mouseY:($scope.POOL_HEIGHT/2), firstLine:false, poolBorder:false, color:'#ff0000', action:'', selectedFigure:null };
    
    var punto={x:0, y:0};
    //var nextOV=[];
    var OV=[[]];
    
    var particle={ B:0.0, next_B:0.0, x:0.0, y:0.0, cd:0.0, M:0.0, Mx:0, My:0, iFigure:0, iLine:0 };
    var OND=[[]];
    var clsC={ B:0.0, x:($scope.POOL_WIDTH/2), y:($scope.POOL_HEIGHT/2), cd:0.0, M:0.0 };
    var C;//array with origin params
    
    var line={ x0:0, y0:0, x1:0, y1:0, rad:0.0, len:0.0, oRad:0.0, oLen:0.0, absorption:0 };
    var figures=[[]];
    var figureDefinitions={square:4, hexagon:6, circle:50 };

    var colorRGBa={ R:0, G:0, B:0, a:255 };
    //var colorOndaRGBa=Object.create(colorRGBa);
    var virtualpalette=[];
    //vars
    var cuenta=0, col=0;
    var canvas = document.getElementById("pool");
    var cpool = canvas.getContext("2d");
    var cpoolData;//=[16];

    var canvasd = document.getElementById("drawingpool");
    var cdrawing = canvasd.getContext("2d");
    var cdrawingData;
    
    //animation frame;
    var idAniSimula=null;
    var idAniMove=null;
    
    //params  op
    var op;
    $scope.params = {resolution:6000, wlength:50, origins:1, timelapse:1, color_back:'#009999', color_crest:'#FFFFAA', color_trough:'#000099', color_transparency:255, end_radius:2014, effect_wake:true, effect_water:false, effect_plasma:false, effect_movement:false, effect_pool_border:true, effect_attenuation:false };
    
    
    
//---------------------------------------------------------------------------
// USER ACTIONS -------------------------------------------------------------
//---------------------------------------------------------------------------
    
    $scope.setParams=function() {
        var i, rgb;
        
        op=$scope.params;

        //change origins
        $scope.num_origins=1;
        
        if(C===undefined || C.length!=op.origins) {
            C=[];
            for(i=0; i<op.origins; i++) {
                C.push(Object.create(clsC));
            }
            refreshDrawing();
        }
        
        Dibujo.color = "#fff";
        cdrawing.shadowColor="#000";
        cdrawing.shadowBlur=5;
        cdrawing.lineWidth=3;
        //draw pool limits
        if(figures.length==0 || figures[figures.length-1].length==0) {
            Linea(0, 0, XMA, 0, Dibujo.color);
            Linea(XMA, 0, XMA, YMA, Dibujo.color);
            Linea(XMA, YMA, 0, YMA, Dibujo.color);
            Linea(0, YMA, 0, 0, Dibujo.color);
        }
        
        //wlength onchange
        virtualpalette=[];
        for(i=0; i<op.wlength; i++) {
            virtualpalette.push(Object.create(colorRGBa));
        }
        CreatePalette();

         //video buffer/s
        cpoolData= cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT);
       
        //wake onchange
        if(this.old_effect_wake!=op.effect_wake) {
            FillPoolWater();
        }
        this.old_effect_wake=op.effect_wake;
    }

//--
    // Notice that chrome.storage.sync.get is asynchronous
    chrome.storage.sync.get('waveartist', function(value) {
        // The $apply is only necessary to execute the function inside Angular scope
        $scope.$apply(function() { $scope.load(value); });
    });
    
//--
    // If there is saved data in storage, use it. Otherwise, bootstrap with DEFAULT
    $scope.load = function(value) {
        var rect=canvas.getBoundingClientRect();
        canvasd.style.top=rect.top;
        canvasd.style.left=rect.left;

        if (value && value.waveartist) {
            $scope.params = value.waveartist;
        } else {
            $scope.params = { resolution:6000, wlength:50, origins:1, timelapse:1, color_back:'#009999', color_crest:'#FFFFAA', color_trough:'#000099', color_transparency:255, end_radius:2014, effect_wake:true, effect_water:false, effect_plasma:false, effect_movement:false, effect_pool_border:true, effect_attenuation:false  };
        }
        
        $scope.setParams(!$scope.params.effect_wake);
        
    }
    
//--
    $scope.save = function() {
        chrome.storage.sync.set({'waveartist': $scope.params});
    };

//--
    $scope.clickMenu=function(strMenu) {
        if($scope.currentMenu!=strMenu) {
            this.counter=0;
            $scope.currentMenu=strMenu;
            $scope.currentSubMenu='';
            $scope.showSubMenu=false;
            refreshDrawing();
        }
        this.counter++;
        
        switch (strMenu) {
            case 'clear':
                if(op.effect_wake) {
                    FillPoolWater();
                }
                else {
                    cpool.clearRect(0,0,$scope.POOL_WIDTH,$scope.POOL_HEIGHT);
                }
                $scope.currentMenu='';
                Dibujo.action='';
                $scope.showSubMenu=false;
                break;
            
            case 'stop':
                if(idAniSimula!=null) {
                    cancelAnimationFrame(idAniSimula);
                    idAniSimula=null;
                }
                else if(idAniMove!=null) {
                    cancelAnimationFrame(idAniMove);
                    idAniMove=null;
                }
                $scope.currentAction='';
                $scope.paused=false;
                Dibujo.action='';
                $scope.showSubMenu=true;
                break;
            
            case 'play':
                if(idAniSimula==null && !$scope.paused) {
                    $scope.showSubMenu=true;
                    $scope.currentAction='play';
                    Dibujo.action='';
                    IniSimula();
                    idAniSimula=requestAnimationFrame(Simula); //call Simula and loops inside with another requestAnimationFrame to Simula
                }
                break;

            case 'movement':
                if(idAniMove==null && !$scope.paused) {
                    $scope.currentAction='movement';
                    startWaveMovement();
                }
                break;
            
            case 'figure':
                $scope.showSubMenu=true;
                break;
            
            case 'lines':
                Dibujo.action='drawLine';
                Dibujo.firstLine=true;
                if(figures[figures.length-1]!='') figures.push([]);
                refreshDrawing();
                break;
            
            case 'select':
                Dibujo.action='drawSelect';
                if(this.counter>1) {
                    drawSelectNext(1);
                }
                $scope.showSubMenu=(Dibujo.selectedFigure!=null);
                refreshDrawing();
                break;
            
            case 'origin':
                if($scope.showSubMenu) {
                    $scope.num_origin++;
                    if($scope.num_origin>$scope.params.origins) $scope.num_origin=1;
                    refreshDrawing();
                }
                else {
                    $scope.showSubMenu=true;
                }
                Dibujo.action='setOrigin';
                break;
        }
    }


//--
    $scope.clickSubMenu=function(strSubMenu) {
        $scope.currentSubMenu=strSubMenu;
        switch (strSubMenu) {
            //play            
            case 'pause':
                if($scope.paused) {
                    idAniSimula=requestAnimationFrame(Simula);
                    $scope.currentSubMenu='';
                }
                else {
                    cancelAnimationFrame(idAniSimula);
                }
                $scope.paused=!$scope.paused;
                break;
            
            //Wake It (movement)
            case 'pauseMove':
                if($scope.paused) {
                    idAniMove=requestAnimationFrame(waveMovement);
                    $scope.currentSubMenu='';
                }
                else {
                    cancelAnimationFrame(idAniMove);
                }
                $scope.paused=!$scope.paused;
                break;
            
            //lines
            case 'closed':
                if(Dibujo.firstLine==false) {
                    Linea(Dibujo.x2,Dibujo.y2,Dibujo.xp,Dibujo.yp,Dibujo.color);
                    refreshDrawing();
                }
                //don't break;
            case 'opened':
                $scope.currentMenu='';
                $scope.currentSubMenu='';
                $scope.showMenuLines=false;
                Dibujo.action='';
                refreshDrawing();
                break;
            
            //select
            case 'move':
                Dibujo.action='drawSelectMove';
                break;
            
            case 'duplicate':
                if(Dibujo.selectedFigure!=null) {
                    duplicateFigure(Dibujo.selectedFigure);
                    Dibujo.action='drawSelect';
                }
                break;

            case 'delete':
                if(Dibujo.selectedFigure!=null) {
                    deleteFigure(Dibujo.selectedFigure);
                    Dibujo.action='drawSelect';
                }
                break;

            case 'divide':
                if(Dibujo.selectedFigure!=null) {
                    divideFigure(Dibujo.selectedFigure);
                    Dibujo.action='drawSelect';
                }
                break;

            //figure
            case 'square':
            case 'hexagon':
            case 'circle':
                createFigure(figureDefinitions[strSubMenu]);
                Dibujo.action='';
                break;
        }
    }

//--
    $scope.toggleDialog=function(name) { 
        //show div ng-class=parameters
        if(idAniSimula==null && idAniMove==null) {
            $scope.showDialog=( $scope.showDialog=='' ? name : '');
        }
    }   

//--
    $scope.drawingClick = function(event) {
        
        Dibujo.mouseX=event.offsetX;
        Dibujo.mouseY=event.offsetY;
        
        switch(Dibujo.action) {
            case 'drawLine':
                if(Dibujo.firstLine) {
                    Dibujo.x1=Dibujo.mouseX;
                    Dibujo.y1=Dibujo.mouseY;
                    //cpool.fillRect(Dibujo.x1, Dibujo.y1, 1, 1);
                    Dibujo.xp=Dibujo.x1;
                    Dibujo.yp=Dibujo.y1;
                    Dibujo.firstLine=false;
                }
                else {
                    Dibujo.x2=Dibujo.mouseX;
                    Dibujo.y2=Dibujo.mouseY;
                    //cpool.fillRect(Dibujo.x2, Dibujo.y2, 1, 1);
                    Linea(Dibujo.x1,Dibujo.y1,Dibujo.x2,Dibujo.y2,Dibujo.color);
                    Dibujo.x1=Dibujo.x2;
                    Dibujo.y1=Dibujo.y2;
                    //after 2 lines you can close a figure
                    $scope.showSubMenu = figures[figures.length-1].length>1;
                }
                break;
            
            case 'drawSelect':
                Dibujo.selectedFigure = pointIsOnFigureLine();
                //select if point is on figure
                if(Dibujo.selectedFigure!=null) {
                    //remark selected figure & show move control
                    refreshDrawing();
                    //show options
                    $scope.showSubMenu=true;
                }
                else {
                    refreshDrawing();
                    $scope.showSubMenu=false;
                }
                break;
            
            case 'drawSelectMove':
                Dibujo.action='drawSelect';
                break;
            
            case 'drawSelectResize':
                Dibujo.action='drawSelect';
                break;
            
            case 'setOrigin':
                var i=$scope.num_origin-1;
                //Puntos de origen
                C[i].x=Dibujo.mouseX;
                C[i].y=YMA-Dibujo.mouseY;
                //Refrescar
                refreshDrawing();
                break;
        }
    }

//--
    $scope.drawingMove = function(event) {
        $scope.drawInfo="x: "+event.offsetX+"  y: "+event.offsetY;
        switch(Dibujo.action) {
            case 'drawSelectMove':
                moveFigure(Dibujo.selectedFigure, event.offsetX, event.offsetY);
                break;
            case 'drawLine':
                if(!Dibujo.firstLine) {
                    refreshDrawing();
                    drawLine(Dibujo.x1,Dibujo.y1,event.offsetX, event.offsetY);
                }
                break;
        }
    }

//---------------------------------------------------------------------------
// SIMULACION                                                               -
//---------------------------------------------------------------------------
    function IniSimula() {
        
        var i, j;

        OND=[[]];
        OV=[[]];


        for (i=0;i<op.origins;i++) {
            OND.push([]);
            for (j=0;j<op.resolution;j++) {
                OND[i].push(Object.create(particle));
            }
        }

        for (i=0;i<=op.origins;i++) { //
            OV.push([]);
            for (j=0;j<op.resolution;j++) {
                OV[i].push(Object.create(punto));
            }
            OV[i].push(Object.create(punto));
        }
        //initialization
        for (i=0;i<=op.origins;i++) {
            OV[i][0].x=0;//Bmax
            OV[i][0].y=i;//Wave Num (=op.origins=nextOV)
        }
    
        DrawPiscina();
        
        //canvas.style.backgroundColor=op.color_back;
    
        // Inicializar valores onda
        for (i=0;i<op.origins;i++) {
            Ini_onda(i);
        }
        
        //video buffer/s
        //cpoolData= cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT);
        //fill pool
        /*if(op.effect_wake) {
            FillPoolWater();
        }
        else {
            cpool.fillStyle = op.color_back;
            cpool.fillRect(0,0,$scope.POOL_WIDTH,$scope.POOL_HEIGHT);
        }*/
        
        //sets initial values
        Simula.colorIndex=0;
        Simula.waveRadius=1;
        Simula.maxWave=1;
        Simula.attenuation=op.end_radius;
        Calcular.force=false;
    }
    
//--
    function Ini_onda(num) {
        var i, j, m; //float m;

        m=2*PI/op.resolution;
        for (j=0;j<op.resolution;j++) {
            OND[num][j].B=j*m; //(float)
            if(OND[num][j].B>PI) OND[num][j].B=OND[num][j].B-2*PI;
            OND[num][j].x=C[num].x;
            OND[num][j].y=C[num].y;
            Colision(num, j);
       }
        /*
        m=op.resolution/360;
        for (j=0;j<op.resolution;j++) {
            OND[num][j].B=j/m; //(float)
            OND[num][j].x=C[num].x;
            OND[num][j].y=C[num].y;
            Colision(num, j);
        }
        */
    }

//--
    function Simula() {
        var i;
    
        //count radius
        //Simula.waveRadius= ++Simula.waveRadius || 1;
        Simula.waveRadius++;
        
        //wave reset when end_radius is reached
        if(Simula.waveRadius>op.end_radius) {
            if (op.origins>1 && Simula.maxWave!=op.origins) Simula.waveRadius-=op.timelapse;
            else Simula.waveRadius=0;
            //Simula.maxWave= ++Simula.maxWave || 1;
            Simula.maxWave++;
            if(Simula.maxWave>op.origins) Simula.maxWave=1;
            if(!op.effect_attenuation) Ini_onda(Simula.maxWave-1);
        }

        //clear only for no wake effect
        if(!op.effect_wake) {
            cpool.clearRect(0,0,$scope.POOL_WIDTH,$scope.POOL_HEIGHT);
            cpoolData= cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT);
            Simula.colorIndex=op.wlength-(op.wlength/4)|0;//index for color_crest
        }

        //draw waves    
        for(i=0; i<op.origins; i++) {
            //start drawing after timelapse between waves
            if(Simula.waveRadius>(op.timelapse*i)) {
                Calcular(i);
                if(!op.effect_wake) {
                    DrawSingleWave(i);
                }
                else {
                    DrawWakeWave(i);
                }
            }
        }
        Calcular.force=false;
        
        //put buffer on canvas
        cpool.putImageData(cpoolData, 0, 0);

        
        //change virtualpalette color index
        Simula.colorIndex++;
        if (Simula.colorIndex==op.wlength) Simula.colorIndex=0;

        if(op.effect_attenuation) {
            Simula.attenuation--;
            PaletteAttenuation();
            if(Simula.attenuation<10) {
                $scope.currentMenu='stop';
                $scope.currentAction='';
            }
        }
        
        if($scope.currentMenu=='stop') {
            //cancelAnimationFrame(idAniSimula);
            idAniSimula=null;
        }
        else {
            idAniSimula=requestAnimationFrame(Simula);
        }
    }

//--
    function Calcular(num_onda) {
        var aux_x, aux_y;//float
        var O=OND[num_onda];
        var previousLine;

        for(j=0;j<op.resolution;j++) {
            if(Calcular.force) {
                Colision(num_onda, j);
            }
            else {
                if(O[j].M>1) O[j].M --;
                
                if (O[j].M<=1) {
//if(num_particle==1018) console.log('------------------');
//if(num_particle==1018) console.log(O[j]);
                    O[j].B = O[j].next_B;
    
                    O[j].x = O[j].Mx+Math.cos(O[j].B)/100;
                    O[j].y = O[j].My+Math.sin(O[j].B)/100;

                    Colision(num_onda, j);
//if(num_particle==1018) console.log(O[j]);

                }    
                else {
                    O[j].x += Math.cos(O[j].B);
                    O[j].y += Math.sin(O[j].B);
                }
            }
        }
 
    }

//--
    function Colision(num_onda, num_particle) {
        var isOK, is2LineCollision, isPerfectAngleCollision;
        var pendiente,ra,rb,Ta,Tb,Tga,Tgb,m; //float 
        var Qax,Qay,Qbx,Qby,Pax,Pay,Pbx,Pby,Cx; //float 
        var Cp=OND[num_onda][num_particle];
        var previousLine = figures[ Cp.iFigure ][ Cp.iLine ];
    
        Cp.M=XYMA;
    
        for (var i in figures) {
            for(var j in figures[i]) {
                fline=figures[i][j];
                //posiciona line.xy0 como origen 0,0
                Pax=fline.x0;
                Pay=fline.y0;
                Pbx=fline.x1-Pax;
                Pby=fline.y1-Pay;
                //traslada particle and its virtual pos on XYMA
                Qax=Cp.x-Pax;
                Qay=Cp.y-Pay;
                Qbx=Cp.x+Math.cos(Cp.B)*XYMA-Pax;
                Qby=Cp.y+Math.sin(Cp.B)*XYMA-Pay;
                //vectors length from origin
                //Pm=Math.sqrt((Pbx*Pbx)+(Pby*Pby));
     
                ra=Math.sqrt((Qax*Qax)+(Qay*Qay));
                rb=Math.sqrt((Qbx*Qbx)+(Qby*Qby));
                //calc angles from x-axis to ra and rb vectors
                if(Math.abs(Qax)>Math.abs(ra)) exit(1);
                Ta=Math.acos(Qax/ra);
                if(Qay<0) Ta=-Ta;
                Tb=Math.acos(Qbx/rb);
                if(Qby<0) Tb=-Tb;
                //rotate line to x-axis, and ra & rb with it
                Tga=Ta-fline.rad;
                Tgb=Tb-fline.rad;
                //calc the new rotated positions
                Qax=ra*Math.cos(Tga);
                Qay=ra*Math.sin(Tga);
                Qbx=rb*Math.cos(Tgb);
                Qby=rb*Math.sin(Tgb);
     
                if((Qax-Qbx)!=0 && (Qay-Qby)!=0) {
                    pendiente=(Qay-Qby)/(Qax-Qbx);
                    Cx=Qax-(Qay/pendiente);
                    //Intersection point inside limits of the particle trayectory
                    if((Cx|0)==(Qax|0) || (Cx|0)==(Qbx|0)) {
                        isOK=((Qay>=0 && 0>=Qby) || (Qay<=0 && 0<=Qby));
                    }
                    else {
                        if (Qax>Qbx) { isOK=(Cx>Qbx && Cx<=Qax); }
                        else { isOK=(Cx>Qax && Cx<=Qbx); }
                    }
                    //...and inside limits of the figure line
                    isOK=isOK && Cx>=-0.5 && Cx<=fline.len+0.5;
//if(num_particle==1018) { console.log(i+' : '+j); console.log(isOK+' Cx:'+Cx+' Qax:'+Qax+' Qbx:'+Qax+' Qay:'+Qax+' Qby:'+Qax+' len:'+fline.len); }
                    if(isOK) {
                        m=Math.sqrt((Qay*Qay)+((Qax-Cx)*(Qax-Cx)))-1;
//if(num_particle==1020) { console.log(m); }                        
                        if(m<Cp.M) {
                            if((Cp.M-m)<=1) { //less of 1 point in the same direction with another line
                                is2LineCollision=true;
                                isPerfectAngleCollision=true;
                            }
                            else if(m<1) { //less of 1 point to collision to next line.
                                is2LineCollision=true;
                                isPerfectAngleCollision=false;
                            }
                            else {
                                is2LineCollision=isPerfectAngleCollision = false;
                            }
                            Cp.Mx=(Cp.x + m * Math.cos(Cp.B));
                            Cp.My=(Cp.y + m * Math.sin(Cp.B));
                            Cp.M=m;
                            Cp.cd=fline.rad;//float
                            Cp.iFigure=i;
                            Cp.iLine=j;
                        }
                    }
                }
            } 
        }
        //calc reflection angle
        if(is2LineCollision) {
            if(isPerfectAngleCollision) {
                Cp.next_B = Cp.B+PI;
                if(Cp.next_B>=PI) Cp.next_B=2*PI-Cp.next_B;
            }
            else {
                Cp.next_B = Calc2LineReflection(num_onda, num_particle, previousLine);
            }
        }
        else {
            Cp.next_B = 360 - Cp.B*180/PI + 2 * (Cp.cd*180/PI);//reflection angle (deg)
            if(Cp.next_B >= 360) Cp.next_B-=360;
            Cp.next_B=(Cp.next_B<180 ? Cp.next_B*PI/180 : ((Cp.next_B-360)*PI/180));//to rad
        }
    }

//--
    function Calc2LineReflection(num_onda, num_particle, fline_prev) {
        var isOK;
        var ra,rb,Tb,Tgb; //float 
        var Qax,Qay,Qbx,Qby; //float 
        var Cp=OND[num_onda][num_particle];

        var fline=figures[Cp.iFigure][Cp.iLine];

        
        Pax=fline.x0;
        Pay=fline.y0;
        Qax=fline_prev.x0-Pax;
        Qay=fline_prev.y0-Pay;
        Qbx=fline_prev.x1-Pax;
        Qby=fline_prev.y1-Pay;
     
        rb=Math.sqrt((Qbx*Qbx)+(Qby*Qby));
     
        Tb=Math.acos(Qbx/rb);
        if(Qby<0) Tb=-Tb;
        Tgb=Tb-fline.rad;

        Qby=rb*Math.sin(Tgb);
        
        closedAngle=Math.asin(Qby/fline_prev.len);
        if(Qbx>Qax) closedAngle=PI/2+PI/2-closedAngle;
        if(fline.rad > (PI+fline_prev.rad)) { //2nd line turn right from 1st
            closedAngle= fline_prev.rad-(closedAngle/2);
        }
        else { //turn left
            closedAngle= fline_prev.rad+(closedAngle/2);
        }
        if(closedAngle<-PI) closedAngle+=2*PI;
        if(closedAngle>=PI) closedAngle-=2*PI;
        return closedAngle;
    }


//--
    function DrawWakeWave(num) {
        var j, J, pJ, x, y, xa, ya, A,B,Bmax,pB;
        var dibujar; //bool
        var r,g,b, ro,go,bo; //unsigned char
        var cfindex;
        var coloraux={R:0,G:0,B:0,a:0}; 
        
        var alphaColor=(op.effect_attenuation ? Simula.attenuation*255/op.end_radius : op.color_transparency);
        
        if(op.effect_plasma || op.effect_water) {
            //takes vectors for nextValues and the previous values of the wave
            var prevOV,nextOV;
            for(j=0; j<=op.origins;j++) {
                if(OV[j][0].y==num) prevOV=OV[j];
                if(OV[j][0].y==op.origins) nextOV=OV[j];
            }
            //takes wave points not painted on the same coordinates
            Bmax=0;
            for(A=0;A<op.resolution;A++) {
                x=(OND[num][A].x | 0);//int
                y=YMA-(OND[num][A].y | 0);
                dibujar=true;
                for(B=Bmax;B>0;B--) {
                    if(x==nextOV[B].x && y==nextOV[B].y) {
                        dibujar=false;
                        B=-1;
                    }
                }
                if(dibujar) {
                    Bmax++;
                    nextOV[Bmax].x=x;
                    nextOV[Bmax].y=y;
                }
            }
            nextOV[0].x=Bmax;
            
            //paint effect
            if(op.effect_plasma) {
                ro=virtualpalette[Simula.colorIndex].R;
                go=virtualpalette[Simula.colorIndex].G;
                bo=virtualpalette[Simula.colorIndex].B;
                //paint the not repeated wave points coordinates
                for(B=1;B<=Bmax;B++) {
                    x=nextOV[B].x;
                    y=nextOV[B].y;
                    dibujar=true;
                    //disables wave point paint if was painted on the previous wave move
                    for(pB=1;pB<=prevOV[0].x;pB++) {
                        if(prevOV[pB].x==x && prevOV[pB].y==y) {
                            dibujar=false;
                            break;
                        }
                    }
                    if(dibujar) {
                        getPixel(x,y,coloraux);
                        coloraux.R=((coloraux.R + ro) & 255);
                        coloraux.G=((coloraux.G + go) & 255);
                        coloraux.B=((coloraux.B + bo) & 255);
                        coloraux.a=alphaColor;
                        setPixel(x, y, coloraux);
                    }
                }
            }
            else if(op.effect_water) {
                //paint the not repeated wave points coordinates
                for(B=1;B<=Bmax;B++) {
                    x=nextOV[B].x;
                    y=nextOV[B].y;
                    dibujar=true;
                    //disables wave point paint if was painted on the previous wave move
                    for(pB=1;pB<=prevOV[0].x;pB++) {
                        if(prevOV[pB].x==x && prevOV[pB].y==y) {
                            dibujar=false;
                            break;
                        }
                    }
                    if(dibujar) {
                        getPixel(x,y,coloraux);
                        //icoloralpha-frame to icolor-frame 
                        cfindex=coloraux.a-256+op.wlength;
                        if(cfindex!=NaN) {
                            if(cfindex<0 || cfindex>=op.wlength) cfindex=0; //background color
                            
                            //mix wave color with pool color, and return the icolor-frame
                            //try {
                            cfindex = Simula.colorIndex + (Simula.colorIndex<(op.wlength/4) || Simula.colorIndex>=(op.wlength*3/4) ? 1 : -1) * virtualpalette[cfindex].level;
                            /*} catch(e) {
                                console.log(x+' ' +y+' '+cfindex);
                            }*/
                            if(cfindex>=op.wlength) cfindex-=op.wlength;
                            if(cfindex<0) cfindex+=op.wlength;
            
                            setPixel(x,y, virtualpalette[cfindex|0]);
                        }
                    }
                }
            }
            //rotate prevOV and nextOV
            nextOV[0].y=prevOV[0].y;
            prevOV[0].y=op.origins;
        }
        else {
            DrawSingleWave(num);
        }
    }

//--
    function DrawSingleWave(num) {
        var j, x, y;

        for(j=0; j<op.resolution; j++) {
            x=(OND[num][j].x | 0); //int
            y=YMA-(OND[num][j].y | 0);
            
            setPixel(x, y, virtualpalette[Simula.colorIndex]);
        }
    }

//--
    function startWaveMovement() {
        var i;
        //create image buffers' array
        startWaveMovement.framesData=[];
        for(i=0; i<op.wlength; i++) {
            startWaveMovement.framesData.push( cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT) );
        }
        
        //rotate colors in each buffer
        for(i=1; i<op.wlength; i++) {
            rotateFramePalette(startWaveMovement.framesData[i], i);
            //show progress?
        }

        //starts animation that rotates buffer showed in canvas
        idAniMove=requestAnimationFrame(waveMovement);
    }
    
//--
    function waveMovement() {
        try {
            waveMovement.frame = --waveMovement.frame || 0;
            if(waveMovement.frame<0) waveMovement.frame=op.wlength-1;
            
            cpool.putImageData(startWaveMovement.framesData[waveMovement.frame], 0, 0);
            idAniMove=requestAnimationFrame(waveMovement);
        }
        catch(e) {
            console.log(e);
        }
    }
    
//--
    function rotateFramePalette(frameData, frameIndex) {
        var c, paletteIndex;
        var base=256-op.wlength;
        var len=frameData.width*frameData.height*4;
        for(var i=3; i<len; i+=4) {
            paletteIndex=cpoolData.data[i]-base;
            if(paletteIndex==-1) { //disables background color animation
                paletteIndex=0;
            }
            else {
                paletteIndex+=frameIndex;
                if(paletteIndex>=op.wlength) paletteIndex-=op.wlength;
            }
            c=virtualpalette[paletteIndex];
            frameData.data[i-3] = c.R;
            frameData.data[i-2] = c.G;
            frameData.data[i-1] = c.B;
            frameData.data[i]=255;
        }
    }

//---------------------------------------------------------------------------
// FIGURES FUNCTIONS                                                        -
//---------------------------------------------------------------------------
    function refreshDrawing() {
        cdrawing.clearRect(0,0,$scope.POOL_WIDTH,$scope.POOL_HEIGHT);
        DrawPiscina();
        if($scope.currentMenu=='origin') VerPuntosOrigen();
    }

//--
    function drawLine(x0,y0,x1,y1) {
        cdrawing.beginPath();
        cdrawing.moveTo(x0, y0);
        cdrawing.lineTo(x1, y1);
        cdrawing.stroke();
    }

//--
    function DrawPiscina() {
        cdrawing.strokeStyle = Dibujo.color;
        for (i in figures) {
            for(j in figures[i]) {
                drawLine(figures[i][j].x0, YMA-figures[i][j].y0, figures[i][j].x1, YMA-figures[i][j].y1);
            }
        }
        if($scope.currentMenu=='select') {
            i=Dibujo.selectedFigure;
            cdrawing.strokeStyle="#fcf";
            for(j in figures[i]) {
                drawLine(figures[i][j].x0, YMA-figures[i][j].y0, figures[i][j].x1, YMA-figures[i][j].y1);
            }
            cdrawing.strokeStyle=Dibujo.color;
        }

    }

//--
    function Linea(x1, y1, x2, y2, color) {
        var ax,ay,bx,by;
        var r,dx,dy,delt;
    
        if(x1>x2) { ax=x2; bx=x1; }
        else {      ax=x1; bx=x2; }
        
        if(y1>y2) { ay=y2; by=y1; }
        else {      ay=y1; by=y2; }
    
        dx=(bx-ax);
        dy=(by-ay);
        
        r = Math.sqrt(dx*dx+dy*dy);
        if(r != NaN) {
            if(y1<y2) delt=-Math.acos((x2-x1)/r);
            else delt=Math.acos((x2-x1)/r);

            cdrawing.strokeStyle = Dibujo.color;
            drawLine(x1,y1,x2,y2);

            //crea linea
            numFigure=(figures.length-1);
            figures[numFigure].push(Object.create(line));
            var newLine=figures[numFigure][(figures[numFigure].length-1)];
            newLine.x0=x1;
            newLine.y0=YMA-y1;
            newLine.x1=x2;
            newLine.y1=YMA-y2;
            newLine.rad=delt;
            newLine.len=r;
            newLine.oRad=delt;
            newLine.oLen=r;
    
            Calcular.force=true;
        }
    }

//--
    function drawSelectNext(number) {
        if(figures.length>1) {
            if(Dibujo.selectedFigure==null) {
                Dibujo.selectedFigure=figures.length-1;
            }
            else {
                number+=Dibujo.selectedFigure;
                if(number>=figures.length) number=1;
                else if(number<=1) number=figures.length-1;
                Dibujo.selectedFigure=number;
            }
            refreshFigureInfo(Dibujo.selectedFigure);
        }
    }
    
//--
    function refreshFigureInfo(iFigure) {
        var fline=figures[iFigure][0];
        $scope.figure_size=Math.round(fline.len/fline.oLen*100);
        $scope.figure_angle=Math.round((fline.oRad-fline.rad)*180/PI);
    }
    
//--
    function pointIsOnFigureLine() {
        var ax,ay, bx,by, px,py,ph, palpha;
        for (var i=1; i<figures.length; i++) {
            for(var j in figures[i]) {
                fline=figures[i][j];
                
                //line
                ax=fline.x0;
                ay=YMA-fline.y0;
                bx=Math.abs(fline.x1-ax);
                by=Math.abs(YMA-fline.y1-ay);
                px=Math.abs(Dibujo.mouseX-ax);
                py=Math.abs(Dibujo.mouseY-ay);
                //inside line size
                if(px<=bx && py<=by) {
                    ph=Math.sqrt(px*px+py*py);                
                    palpha=(ay<Dibujo.mouseY ? -1 : 1)*Math.acos((Dibujo.mouseX-ax)/ph);
                    //near angle
                    if(Math.abs((palpha+PI)-(fline.rad+PI))<0.5) {
                        refreshFigureInfo(i)
                        return i;
                    }
                }
            }
        }
        return null;
    }

//--
    function moveFigure(iFigure, newX, newY) {
        newY=YMA-newY;
        
        var difX=newX-figures[iFigure][0].x0;
        var difY=newY-figures[iFigure][0].y0;
        
        figures[iFigure][0].x0=newX;
        figures[iFigure][0].y0=newY;
        figures[iFigure][0].x1+=difX;
        figures[iFigure][0].y1+=difY;
        for(j=1; j<figures[iFigure].length; j++) {
            figures[iFigure][j].x0+=difX;
            figures[iFigure][j].y0+=difY;
            figures[iFigure][j].x1+=difX;
            figures[iFigure][j].y1+=difY;
        }
        refreshDrawing();
        Calcular.force=true;
    }

//--
    $scope.figureSize=function() {
        var endX, endY;
        var iFigure=Dibujo.selectedFigure;
        
        //startX y startY = punto 0 figura
        var startX = figures[iFigure][0].x0;
        var startY = figures[iFigure][0].y0;

        for(j=0; j<figures[iFigure].length; j++) {
            //proportional size
            figures[iFigure][j].len = figures[iFigure][j].oLen * $scope.figure_size/100;
            endX=startX + Math.round(figures[iFigure][j].len*Math.cos(figures[iFigure][j].rad));
            endY=startY + Math.round(figures[iFigure][j].len*Math.sin(figures[iFigure][j].rad));
            
            figures[iFigure][j].x0 = startX;
            figures[iFigure][j].y0 = startY;
            figures[iFigure][j].x1 = endX;
            figures[iFigure][j].y1 = endY;
            startX=endX;
            startY=endY;
        }
        refreshDrawing();
        Calcular.force=true;
    }
    
//--
    $scope.figureAngle=function() {
        var endX, endY;
        var iFigure=Dibujo.selectedFigure;
        
        //startX y startY = punto 0 figura
        var startX = figures[iFigure][0].x0;
        var startY = figures[iFigure][0].y0;

        for(j=0; j<figures[iFigure].length; j++) {
            //add angle
            figures[iFigure][j].rad = figures[iFigure][j].oRad + ($scope.figure_angle*-PI/180);
            if(figures[iFigure][j].rad>PI) figures[iFigure][j].rad=-2*PI+figures[iFigure][j].rad;
            else if(figures[iFigure][j].rad<-PI) figures[iFigure][j].rad=2*PI+figures[iFigure][j].rad;
            
            endX=startX + Math.round(figures[iFigure][j].len*Math.cos(figures[iFigure][j].rad));
            endY=startY + Math.round(figures[iFigure][j].len*Math.sin(figures[iFigure][j].rad));
            
            figures[iFigure][j].x0 = startX;
            figures[iFigure][j].y0 = startY;
            figures[iFigure][j].x1 = endX;
            figures[iFigure][j].y1 = endY;
            startX=endX;
            startY=endY;
        }
        refreshDrawing();
        Calcular.force=true;
    }

//--
    function duplicateFigure(iFigure) {
        //new figure
        if(figures[figures.length-1]!='') figures.push([]);
        iFigureNew=figures.length-1;
        //duplicate
        for(j=0; j<figures[iFigure].length; j++) {
            figures[iFigureNew].push(Object.create(figures[iFigure][j]));
        }
        //select new figure
        Dibujo.selectedFigure=iFigureNew;
        //move from the original position to make it visible
        moveFigure(iFigureNew, figures[iFigureNew][0].x0+20, figures[iFigureNew][0].y0+20);
        
        refreshDrawing();
    }

//--
    function divideFigure(iFigure) {
        half=Math.round(figures[iFigure].length/2);
        if(half>1) {
            figures[iFigure].splice(half,half);
        }
        refreshDrawing();
        Calcular.force=true;
   }

//--
    function createFigure(faces) {
        var startX=Math.round($scope.POOL_WIDTH/2);
        var startY=Math.round($scope.POOL_HEIGHT/2);
        var rad=2*PI/faces, angle;
        var lineLen=Math.round(100/faces);
        
        //new figure
        if(figures[figures.length-1]!='') figures.push([]);
        iFigureNew=figures.length-1;
        //create lines
        angle=PI;
        for(j=0; j<faces; j++) {
            figures[iFigureNew].push(Object.create(line));

            endX=startX + lineLen*Math.cos(angle);
            endY=startY + lineLen*Math.sin(angle);
            figures[iFigureNew][j].x0=startX;
            figures[iFigureNew][j].y0=startY;
            figures[iFigureNew][j].x1=endX;
            figures[iFigureNew][j].y1=endY;
            figures[iFigureNew][j].rad=angle;
            figures[iFigureNew][j].len=lineLen;
            figures[iFigureNew][j].oRad=angle;
            figures[iFigureNew][j].oLen=lineLen;
            
            startX=endX;
            startY=endY;
            angle-=rad;
        }
        //select new figure
        Dibujo.selectedFigure=iFigureNew;
        
        refreshDrawing();
    }

//--
    function deleteFigure(iFigure) {
        figures.splice(iFigure,1);
        Dibujo.selectedFigure=null;
        drawSelectNext(1);
        if(Dibujo.selectedFigure==null) $scope.showSubMenu=false;
        refreshDrawing();
        Calcular.force=true;
    }

//--
    function VerPuntosOrigen() {
        var x,y, lon;
        var blur=cdrawing.shadowBlur;
        cdrawing.shadowBlur=1;;
        for(var i=0;i<op.origins;i++) {
            x=C[i].x;
            y=YMA-C[i].y;
            lon=4;
            cdrawing.strokeStyle = Dibujo.color;
            cdrawing.fillStyle = Dibujo.color;
            cdrawing.font="18px Arial";
            //selected;
            if($scope.currentMenu=='origin' && i==($scope.num_origin-1)) {
                lon=6
                cdrawing.strokeStyle = "#fcf";
                cdrawing.fillStyle = "#fcf"; 
                cdrawing.font="22px Arial";
            }
            drawLine(x-lon,y,x+lon,y);
            drawLine(x,y-lon,x,y+lon);
            cdrawing.textAlign=(x<($scope.POOL_WIDTH/2) ? "start" : "end"); 
            cdrawing.textBaseline=(y<($scope.POOL_HEIGHT/2) ? "top" :"bottom");
            cdrawing.fillText((i+1),x, y + (lon+2)*(y<($scope.POOL_HEIGHT/2) ? 1 : -1));
        }
        cdrawing.shadowBlur=blur;
    }

//---------------------------------------------------------------------------
// PAINT FUNCTIONS                                                          -
//---------------------------------------------------------------------------
    function setPixel(x, y, c) {
        var index = (x + y * $scope.POOL_WIDTH) * 4;
        cpoolData.data[index] = c.R;
        cpoolData.data[index+1] = c.G;
        cpoolData.data[index+2] = c.B;
        cpoolData.data[index+3] = c.a;
    }
    
//--
    function getPixel(x, y, c) {
        var index = (x + y * $scope.POOL_WIDTH) * 4;
        c.R=cpoolData.data[index];
        c.G=cpoolData.data[index+1];
        c.B=cpoolData.data[index+2];
        c.a=cpoolData.data[index+3];
    }

//--
    function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

//--
    function FillPoolWater() {
        cpool.clearRect(0,0,cpoolData.width,cpoolData.height);
        var len=cpoolData.width*cpoolData.height*4;
        var c=virtualpalette[0];
        for(var i=3; i<len; i+=4) {
            cpoolData.data[i-3] = c.R;
            cpoolData.data[i-2] = c.G;
            cpoolData.data[i-1] = c.B;
            cpoolData.data[i] = c.a-1;
        }
        cpool.putImageData(cpoolData, 0, 0);
    }

    
//---------------------------------------------------------------------------
// COLOR FUNCTIONS                                                          -
//---------------------------------------------------------------------------
    function CreatePalette() {
        var cT=Object.create(colorRGBa);
        var cB=Object.create(colorRGBa);
        var cC=Object.create(colorRGBa);
        var c=Object.create(colorRGBa);
        var i,rad,irad, sinrad;
    
        cT=ConvertHEXtoRGB(op.color_trough);
        cB=ConvertHEXtoRGB(op.color_back);
        cC=ConvertHEXtoRGB(op.color_crest);
        //DegradePalette(0, ((op.wlength-1)/4)|0, cA, cB, 0, 90);
        
        //sinusoidal palette gradient

        irad = 2*PI/op.wlength;
        rad = 0;
        for(i=op.wlength-1; i>=0; i--) {
            sinrad=Math.sin(rad);
            if(rad<PI) {
                c.R = cB.R*(1-sinrad) + cC.R*sinrad; 
                c.G = cB.G*(1-sinrad) + cC.G*sinrad;
                c.B = cB.B*(1-sinrad) + cC.B*sinrad;
            }
            else {
                c.R = cB.R*(1-Math.abs(sinrad)) + Math.abs(cT.R*sinrad);
                c.G = cB.G*(1-Math.abs(sinrad)) + Math.abs(cT.G*sinrad);
                c.B = cB.B*(1-Math.abs(sinrad)) + Math.abs(cT.B*sinrad);
            }
            virtualpalette[i].R=(c.R | 0);//int
            virtualpalette[i].G=(c.G | 0);
            virtualpalette[i].B=(c.B | 0);
            virtualpalette[i].a=256-op.wlength+i;
            virtualpalette[i].level=sinrad*op.wlength/4;

            rad+=irad;
        }
    }

//--
    function PaletteAttenuation() {
        var alpha=Simula.attenuation*255/op.end_radius;
        for(i=op.wlength-1; i>=0; i--) {
            virtualpalette[i].a=alpha;
        }
    }
    
//--
    function GradientPalette( ini, fin, cA, cB) {
        var c=Object.create(colorRGBa);//float
        var ci=Object.create(colorRGBa);//float

        c.R=cB.R-cA.R;
        c.G=cB.G-cA.G;
        c.B=cB.B-cA.B;
        ci.R=0;
        ci.G=0;
        ci.B=0;
        if (c.R!=0) ci.R=c.R/(fin-ini);
        if (c.G!=0) ci.G=c.G/(fin-ini);
        if (c.B!=0) ci.B=c.B/(fin-ini);

        c.R = cA.R; 
        c.G = cA.G;
        c.B = cA.B;

        while (ini<fin) {
            virtualpalette[ini].R=c.R|0;//(int)
            virtualpalette[ini].G=c.G|0;
            virtualpalette[ini].B=c.B|0;
            virtualpalette[ini].a=op.color_transparency;

            c.R+=ci.R;
            c.G+=ci.G;
            c.B+=ci.B;
            ini++;
        }
    }

//--
    function ConvertRGBtoINDEX(rgb) {
        var imax=((op.wlength*3/4) | 0);

        for(var i=((op.wlength/4) | 0); i<imax; i++) {
            if( virtualpalette[i].R==rgb.R && virtualpalette[i].G==rgb.G && virtualpalette[i].B==rgb.B )
                return op.wlength-(i+(op.wlength/4));
        }
        return op.wlength-(imax+(op.wlength/4));
    }

//--
    function ConvertHEXtoRGB(hex) { 
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            R: parseInt(result[1], 16),
            G: parseInt(result[2], 16),
            B: parseInt(result[3], 16),
            a: op.color_transparency
        } : null;
    }

//--
    function ConvertRGBtoHEX(rgb) { 
        return "#" + ((1 << 24) + (rgb.R << 16) + (rgb.G << 8) + rgb.B).toString(16).slice(1);
    }
}


/*********************
     function DrawWakeWave(num) {
        var j, J, pJ, x, y, xa, ya, A,B,Bmax,pB,Btest;
        var dibujar; //bool
        var r,g,b, ro,go,bo; //unsigned char
        var cfindex;
        var coloraux={R:0,G:0,B:0,a:op.color_transparency}; //TColor
    
        if(op.effect_plasma || op.effect_water) {
            var ratioPrevNext;
            prevOV[num][0].x=nextOV[0].x || 0;//previous Bmax
            //takes wave points not painted on the same coordinates
            Bmax=0;
            for(A=0;A<op.resolution;A++) {
                x=(OND[num][A].x | 0);//int
                y=(($scope.YMA-OND[num][A].y) | 0);
                dibujar=true;
                for(B=Bmax;B>0;B--) {
                    if(x==nextOV[B].x && y==nextOV[B].y) {
                        dibujar=false;
                        B=-1;
                    }
                }
                if(dibujar) {
                    Bmax++;
                    prevOV[num][Bmax].x=nextOV[Bmax].x || 0;
                    prevOV[num][Bmax].y=nextOV[Bmax].y || 0;
                    nextOV[Bmax].x=x;
                    nextOV[Bmax].y=y;
                }
            }
            nextOV[0].x=Bmax;
            ratioPrevNext=prevOV[num][0].x/Bmax;
            Btest=Btest=(prevOV[num][0].x<=64 ? prevOV[num][0].x : (64* (1-64 / (op.resolution-prevOV[num][0].x+1) ) )|0) || 0;//(Bmax/prevOV[num][0].x)|0;
            //paint the not repeated wave points coordinates
            for(B=1;B<=Bmax;B++) {
                x=nextOV[B].x;
                y=nextOV[B].y;
                dibujar=true;
                //disables wave point paint if was painted on the previous wave move
                if(Btest==1) {
                    pB=(B*ratioPrevNext)|0;
                    dibujar=!(prevOV[num][pB].x==x && prevOV[num][pB].y==y);
                }
                else {
                    pB=((B*ratioPrevNext)-(Btest/2))|0;
                    if(pB<1) pB+=prevOV[num][0].x;
                    for(j=0;j<Btest;j++) {
                        if(prevOV[num][pB].x==x && prevOV[num][pB].y==y) {
                            dibujar=false;
                            break;
                        }
                        pB++;
                        if(pB==0) pB=1;
                    }
                }
                if(dibujar) {
                    if(op.effect_plasma) {
                        console.log("");
                    }
                    else if(op.effect_water) {
                        getPixel(x,y,coloraux);
                        //icoloralpha-frame to icolor-frame 
                        cfindex=coloraux.a-256+op.wlength;
                        
                        //mix wave color with pool color, and return the icolor-frame
                        cfindex = cindex + (cindex<(op.wlength/4) || cindex>=(op.wlength*3/4) ? 1 : -1) * virtualpalette[cfindex].level;
        
                        if(cfindex>=op.wlength) cfindex-=op.wlength;
                        if(cfindex<0) cfindex+=op.wlength;
        
                        setPixel(x,y, virtualpalette[cfindex|0]);
                    }
                }
            }
        }
        else {
            DrawSingleWave();
        }        
    }
*********************/

    /*    
        if(op.effect_plasma==1) {    
            ro=virtualpalette[cindex].R;
            go=virtualpalette[cindex].G;
            bo=virtualpalette[cindex].B;
            
            J=0;
            x=(OND[num][0].x | 0);//int
            y=(($scope.YMA-OND[num][0].y) | 0);
            nextOV[0].x=x;
            nextOV[0].y=y;
            
            for(j=1; j<op.resolution; j++) {
                x=(OND[num][j].x | 0);//int
                y=(($scope.YMA-OND[num][j].y) | 0);
                dibujar = !(x==nextOV[J].x && y==nextOV[J].y);
                if(dibujar) {
                    J++;
                    nextOV[J].x=x;
                    nextOV[J].y=y;
                }
            }
            
            while(J>=0) {
                x=nextOV[J].x;
                y=nextOV[J].y;

                getPixel(x,y,coloraux);
                coloraux.R=((coloraux.R + ro) & 255);
                coloraux.G=((coloraux.G + go) & 255);
                coloraux.B=((coloraux.B + bo) & 255);
                coloraux.a=op.color_transparency;
                setPixel(x, y, coloraux);
                
                J--;
            }
   
            //prevOV.splice(num,1,Object.create(nextOV));
            //prevOV[num][0].x=Bmax;
        }
        //water
        else if(op.effect_water) {
            x=(OND[num][0].x | 0);//int
            y=(($scope.YMA-OND[num][0].y) | 0);
            nextOV[0].x=x;
            nextOV[0].y=y;
            J=0;
           
            for(j=0; j<op.resolution; j++) {
                x=(OND[num][j].x | 0);//int
                y=(($scope.YMA-OND[num][j].y) | 0);
                dibujar = (x!=nextOV[J].x || y!=nextOV[J].y);
                if(dibujar) {
                    J++;
                    nextOV[J].x=x;
                    nextOV[J].y=y;
                }
            }

            while(J>=0) {
                x=nextOV[J].x;
                y=nextOV[J].y;

                getPixel(x,y,coloraux);
                //icoloralpha-frame to icolor-frame 
                cfindex=coloraux.a-256+op.wlength;
                
                //mix wave color with pool color, and return the icolor-frame
                cfindex = cindex + (cindex<(op.wlength/4) || cindex>=(op.wlength*3/4) ? 1 : -1) * virtualpalette[cfindex].level;

                if(cfindex>=op.wlength) cfindex-=op.wlength;
                if(cfindex<0) cfindex+=op.wlength;

                setPixel(x,y, virtualpalette[cfindex|0]);

                
                J--;
            }
        
        }
        //no effects
        else {
            DrawSingleWave(num);
        }
    */
//colision
        /*var Ox,Oy, Lx,Ly, Th,Ta,Tb,Trad, Ua,Ph,Px,Py, Cx,Cy, inside;
        var Cp=OND[num_onda][num_particle];
    
        Cp.M=0;
        alpha=Cp.B;
    
        for (var i in figures) {
            for(var j in figures[i]) {
                fline=figures[i][j];
                
                //traslate
                Ox=0-Cp.x;
                Oy=0-Cp.y;
                Lx=fline.x0+Ox;
                Ly=fline.y0+Oy;
                //rotate 
                Th=Math.sqrt(Lx*Lx+Ly*Ly);
                Trad=Math.acos(Lx/Th);
                lOp=Trad-alpha;
                Ta=Math.cos(lOp)*Th;
                Tb=Math.sin(lOp)*Th;
                if(Ly<0 && alpha<0) Tb=-Tb;
                //solve P
                lPo=Math.abs((fline.rad<0 ? fline.rad+PI : fline.rad) - (alpha<0 ? alpha+PI : alpha));
                Ua=Tb/Math.tan(lPo);
                Ph=Math.abs(Ta+Ua);
                //de-rotate and de-traslate
                Px=(Math.cos(alpha)*Ph-Ox)|0;
                Py=(Math.sin(alpha)*Ph-Oy)|0;
                //calculate Cp+XYMA
                Cx=Cp.x+Math.cos(alpha)*XYMA;
                Cy=Cp.y+Math.sin(alpha)*XYMA;
                //P is inside figure line
                inside=(Math.abs(Px-fline.x0)<=Math.abs(fline.x1-fline.x0) && Math.abs(Py-fline.y0)<=Math.abs(fline.y1-fline.y0));
                inside=inside && (Math.abs(Px-fline.x0)<=Math.abs(Cx-Cp.x) && Math.abs(Py-fline.y0)<=Math.abs(Cy-Cp.y));
//console.log(num_onda+":"+Cp.B+":"+j+" X:"+Math.abs(Px-fline.x0)+"<="+Math.abs(fline.x1-fline.x0)+" Y:"+Math.abs(Py-fline.y0)+"<="+Math.abs(fline.y1-fline.y0)+" Ph:"+Ph+" P:"+Px+", "+Py+" lOp:"+lOp+" lPo:"+lPo);
//console.log(Cp.B+" a:"+alpha+" b:"+fline.rad+" Trad:"+Trad+" O:"+Ox+","+Oy+" L:"+Lx+","+Ly+" Th:"+Th+" Ta:"+Ta+" Tb:"+Tb+" Ua:"+Ua);                
                if(inside && (Cp.M==0 || Cp.M>Ph)) {
                    Cp.M=Ph;
                    Cp.cd=fline.rad;//float
                    //console.log("************");
                }
            } 
        }
        */


/*    function Calcular(num_onda) {
        var A;
        var aux_x, aux_y;//float
        var O=OND[num_onda];

        for(j=0;j<op.resolution;j++) {
            if(Calcular.force) {
                //aux_x=Math.cos(O[j].B);
                //aux_y=Math.sin(O[j].B);
                //O[j].M = O[j].M - Math.sqrt((aux_x*aux_x)+(aux_y*aux_y));

                //O[j].x = O[j].x + Math.cos( O[j].B );
                //O[j].y = O[j].y + Math.sin( O[j].B );

                Colision(num_onda, j);
            }
            else {
                O[j].M --;
                if (O[j].M<1) {
                    O[j].B = 360 - O[j].B*180/PI + 2 * (O[j].cd*180/PI);//reflection angle (deg)
                    if(O[j].B >= 360) O[j].B-=360;
                    O[j].B=(O[j].B<180 ? O[j].B*PI/180 : ((O[j].B-360)*PI/180));//to rad
    
                    O[j].x = O[j].Mx;
                    O[j].y = O[j].My;

                    Colision(num_onda, j);
                }    
                else {
                    O[j].x += Math.cos(O[j].B);
                    O[j].y += Math.sin(O[j].B);
                }
            }
        }
 
    }

//--
    function Colision(num_onda, num_particle) {
        var cond_b;
        var pendiente,ra,rb,Ta,Tb,Tga,Tgb,m; //float 
        var Qax,Qay,Qbx,Qby,Pax,Pay,Pbx,Pby,Pm,Cx; //float 
        var Cp=OND[num_onda][num_particle];
    
        Cp.M=0;
    
        for (var i in figures) {
            for(var j in figures[i]) {
                fline=figures[i][j];
                
                Pax=(fline.x0);
                Pay=(fline.y0);
                Pbx=(fline.x1)-Pax;
                Pby=(fline.y1)-Pay;
                Qax=Cp.x-Pax;
                Qay=Cp.y-Pay;
                Qbx=Cp.x+Math.cos(Cp.B)*XYMA-Pax;
                Qby=Cp.y+Math.sin(Cp.B)*XYMA-Pay;
     
                Pm=Math.sqrt((Pbx*Pbx)+(Pby*Pby));
     
                ra=Math.sqrt((Qax*Qax)+(Qay*Qay));
                rb=Math.sqrt((Qbx*Qbx)+(Qby*Qby));
     
                if(Math.abs(Qax)>Math.abs(ra)) exit(1);
                Ta=Math.acos(Qax/ra);
                if(Qay<0) Ta=-Ta;
                Tb=Math.acos(Qbx/rb);
                if(Qby<0) Tb=-Tb;
                Tga=Ta-(fline.rad);
                Tgb=Tb-(fline.rad);
     
                Qax=ra*Math.cos(Tga);
                Qay=ra*Math.sin(Tga);
                Qbx=rb*Math.cos(Tgb);
                Qby=rb*Math.sin(Tgb);
                Pbx=Pm;
     
                if((Qax-Qbx)!=0 && (Qay-Qby)!=0) {
                    pendiente=(Qay-Qby)/(Qax-Qbx);
                    Cx=Qax-(Qay/pendiente);
     
                    if (Qax>Qbx) { cond_b=(Cx>Qbx && Cx<=Qax); }
                    else { cond_b=(Cx>=Qax && Cx<Qbx); }
     
                    if((Cx>=0 && Cx<=(Pbx)) && cond_b) {
                        m=Math.sqrt((Qay*Qay)+((Qax-Cx)*(Qax-Cx))).toFixed(10);
                        if(m>1 && (Cp.M==0 || Cp.M>m)) {
                            Cp.M=m;
                            Cp.Mx=(Cp.x + Cp.M * Math.cos(Cp.B))|0;
                            Cp.My=(Cp.y + Cp.M * Math.sin(Cp.B))|0;
                            Cp.cd=fline.rad;//float
                        }
                    }
                }
            } 
        }
    }
 */


/*    function Calcular(num_onda) {
        var A;
        var aux_x, aux_y;//float
        var O=OND[num_onda];

        for(j=0;j<op.resolution;j++) {
            if(Calcular.force) {
                aux_x=Math.cos(O[j].B);
                aux_y=Math.sin(O[j].B);
                O[j].M = O[j].M - Math.sqrt((aux_x*aux_x)+(aux_y*aux_y));

                O[j].x = O[j].x + Math.cos( O[j].B );
                O[j].y = O[j].y + Math.sin( O[j].B );

                Colision(num_onda, j);
            }
            else {
                aux_x=Math.cos(O[j].B);
                aux_y=Math.sin(O[j].B);
                O[j].M --;
                if (O[j].M<1) {
                    O[j].B = 360 - O[j].B*180/PI + 2 * (O[j].cd*180/PI);//reflection angle (deg)
                    if(O[j].B >= 360) O[j].B-=360;
                    O[j].B=(O[j].B<180 ? O[j].B*PI/180 : ((O[j].B-360)*PI/180));//to rad
    
                    O[j].x = O[j].x + Math.cos( O[j].B );
                    O[j].y = O[j].y + Math.sin( O[j].B );

                    Colision(num_onda, j);
                }    
                else {
                    O[j].x = O[j].x + aux_x;
                    O[j].y = O[j].y + aux_y;
                }
            }
        }
    }

//--
    function Colision(num_onda, num_particle) {
        var cond_b;
        var pendiente,ra,rb,Ta,Tb,Tga,Tgb,m; //float 
        var Qax,Qay,Qbx,Qby,Pax,Pay,Pbx,Pby,Pm,Cx; //float 
        var Cp=OND[num_onda][num_particle];
    
        Cp.M=0;
    
        for (var i in figures) {
            for(var j in figures[i]) {
                fline=figures[i][j];
                
                Pax=(fline.x0);
                Pay=(fline.y0);
                Pbx=(fline.x1)-Pax;
                Pby=(fline.y1)-Pay;
                Qax=Cp.x-Pax;
                Qay=Cp.y-Pay;
                Qbx=Cp.x+Math.cos(Cp.B)*XYMA-Pax;
                Qby=Cp.y+Math.sin(Cp.B)*XYMA-Pay;
     
                Pm=Math.sqrt((Pbx*Pbx)+(Pby*Pby));
     
                ra=Math.sqrt((Qax*Qax)+(Qay*Qay));
                rb=Math.sqrt((Qbx*Qbx)+(Qby*Qby));
     
                if(Math.abs(Qax)>Math.abs(ra)) exit(1);
                Ta=Math.acos(Qax/ra);
                if(Qay<0) Ta=-Ta;
                Tb=Math.acos(Qbx/rb);
                if(Qby<0) Tb=-Tb;
                Tga=Ta-(fline.rad);
                Tgb=Tb-(fline.rad);
     
                Qax=ra*Math.cos(Tga);
                Qay=ra*Math.sin(Tga);
                Qbx=rb*Math.cos(Tgb);
                Qby=rb*Math.sin(Tgb);
                Pbx=Pm;
     
                if((Qax-Qbx)!=0 && (Qay-Qby)!=0) {
                    pendiente=(Qay-Qby)/(Qax-Qbx);
                    Cx=Qax-(Qay/pendiente);
     
                    if (Qax>Qbx) { cond_b=(Cx>Qbx && Cx<=Qax); }
                    else { cond_b=(Cx>=Qax && Cx<Qbx); }
     
                    if ((Cx>=0 && Cx<=(Pbx))&& cond_b) {
     
                        m=Math.sqrt((Qay*Qay)+((Qax-Cx)*(Qax-Cx)));
                        if(Cp.M==0 || Cp.M>m) {
                            Cp.M=m;
                            Cp.cd=fline.rad;//float
                            
                        }
                    }
                }
            } 
        }
    }

 */