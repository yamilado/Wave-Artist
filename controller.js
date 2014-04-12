/*-----------------------------------------------------*/
/*- Wave Artist v.0.0.0.1                 24-feb-2014 -*/
/*- Copyright (c) 2014 L.Yamil Martinez (G+ yamilado) -*/
/*- Licensed under The Artistic License 2.0           -*/
/*-----------------------------------------------------*/

function WAController($scope) {
    //about
    $scope.credits="about";
    $scope.appName='Wave Artist';
    $scope.appVersion='0.0.0.2';
    $scope.appAuthor='L. Yamil';
    $scope.appContact='G+ yamilado';
    $scope.appWeb='';
    $scope.appEULA='Artistic License 2.0';
    $scope.appComment="Dedicated to my daughter, family and friends for their support. Thanks.";
    //constants
    var PI=Math.PI;
    var XMA=799;
    var YMA=549;
    var XYMA=2000; //>sqrt(XMA^2+YMA^2)
    var FIGURE_SETS={ square:4, hexagon:6, circle:50 }; //predefined set of figures with their lines' number
	var ANIMATION_TIME=150; //time between animation frames in milliseconds

    $scope.POOL_WIDTH=XMA+1;
    $scope.POOL_HEIGHT=YMA+1;
    $scope.MAXORIGINS=10;

	//scoped variables
    $scope.showDialog='';
    $scope.num_origin=1;
    $scope.currentAction='';
    $scope.currentMenu='';
    $scope.currentSubMenu='';
    $scope.showSubMenu=false;
    $scope.drawInfo="";
    $scope.paused=false;

    //prototypes
    var colorRGBa={ R:0, G:0, B:0, a:255 };

    var point={x:0, y:0}; 

    var particle={ 
		B:0.0, //direction angle (rad)
		next_B:0.0, //next direction angle after collision
		x:0.0, y:0.0, //actual position
		cd:0.0, //collisioned line angle (rad)
		M:0.0, //distance to collision point in pixels
		Mx:0, My:0, //collision point
		iFigure:0, //index of collision figure
		iLine:0 //index of collision line (of the figure)
	};
	
    var poolCenterPoint={ 
		x:($scope.POOL_WIDTH/2), y:($scope.POOL_HEIGHT/2), 
	};

    var line={ 
		x0:0, y0:0, //start point
		x1:0, y1:0, //end point
		rad:0.0, //actual line angle (rad)
		len:0.0, //actual line length in pixels
		oRad:0.0, //original line angle (rad)
		oLen:0.0, //original line length in pixels
		absorption:0 //future use
	};

	//global arrays
    var waves=[[]]; //waves and particles
    
    var wavesPosBuffer=[[]]; //waves and particles' position only buffer
    
	var origins; //origin points
    
    var figures=[[]]; //drawed figures

    var virtualpalette=[]; //wave color palette

	//canvas used for wave simulation 
    var canvas = document.getElementById("pool");
    var cpool = canvas.getContext("2d");
    var cpoolData;

	//canvas used for drawing
    var canvasd = document.getElementById("drawingpool");
    var cdrawing = canvasd.getContext("2d");
    var cdrawingData;
    
    //animation variables
    var afSimulation=null;
    var afMovement=null;
    var idTimer;
    
	//drawing state variables
    var drawing={ 
		x1:0, y1:0,
		x2:0, y2:0,
		xp:0, yp:0, 
		mouseX:($scope.POOL_WIDTH/2), mouseY:($scope.POOL_HEIGHT/2), 
		firstLine:false, 
		poolBorder:false, 
		color:'#ff0000', 
		action:'', 
		selectedFigure:null 
	};

	//stored application parameters
    $scope.params = {
		resolution:5960, 
		wlength:50, 
		origins:1, 
		timelapse:1, 
		color_back:'#009999', 
		color_crest:'#FFFFAA', 
		color_trough:'#000099', 
		color_transparency:255, 
		end_radius:2000, 
		effect_wake:true, 
		effect_water:false, 
		effect_plasma:false, 
		effect_movement:false, 
		effect_pool_border:true, 
		effect_attenuation:false, 
		effect_spiral:false 
	};
    var op; //alias for $scope.params

    
    
    
//---------------------------------------------------------------------------
// App Params Functions                                                     -
//---------------------------------------------------------------------------
    
    // Notice that chrome.storage.sync.get is asynchronous
    chrome.storage.sync.get('waveartist', function(value) {
        //The $apply is only necessary to execute the function inside Angular scope
        $scope.$apply(function() { $scope.load(value); });
    });
    
//--
    $scope.save = function() {
        var result=chrome.storage.sync.set({'waveartist': $scope.params});
    };

//--
    // If there is saved data in storage, use it. Otherwise, bootstrap with DEFAULT
    $scope.load = function(value) {
		//set drawing canvas position
        var rect=canvas.getBoundingClientRect();
        canvasd.style.top=rect.top;
        canvasd.style.left=rect.left;

        //load params or set defaults
        if (value && value.waveartist) {
            $scope.params = value.waveartist;
        } 
        else {
            $scope.params = { 
				resolution:5960, 
				wlength:50, 
				origins:1, 
				timelapse:1, 
				color_back:'#009999', 
				color_crest:'#FFFFAA', 
				color_trough:'#000099', 
				color_transparency:255, 
				end_radius:2000, 
				effect_wake:true, 
				effect_water:false, 
				effect_plasma:false, 
				effect_movement:false, 
				effect_pool_border:true, 
				effect_attenuation:false, 
				effect_spiral:false
            }
        }
        
        $scope.setParams();
        
    }
    
//--
    $scope.setParams=function() {
        var i, rgb;
        
        op=$scope.params;

        //change origins
        $scope.num_origins=1;
        
        if(origins===undefined || origins.length!=op.origins) {
            origins=[];
            for(i=0; i<op.origins; i++) {
                origins.push(Object.create(poolCenterPoint));
            }
            RefreshDrawing();
        }

		//set drawing params
        drawing.color = "#fff";
        cdrawing.shadowColor="#000";
        cdrawing.shadowBlur=5;
        cdrawing.lineWidth=3;

        //draw pool limits if not yet drew
        if(figures.length==0 || figures[figures.length-1].length==0) {
            NewLine(0, 0, XMA, 0, drawing.color);
            NewLine(XMA, 0, XMA, YMA, drawing.color);
            NewLine(XMA, YMA, 0, YMA, drawing.color);
            NewLine(0, YMA, 0, 0, drawing.color);
        }
        
        //wlength onchange resets palette
        if(this.old_wlength!=op.wlength) {
			virtualpalette=[];
			for(i=0; i<op.wlength; i++) {
				virtualpalette.push(Object.create(colorRGBa));
			}
			CreatePalette();
		}

        //video buffer/s
        cpoolData= cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT);
       
        //wake onchange
        if(this.old_effect_wake!=op.effect_wake) {
            FillPoolWater();
        }
        
        //refresh old values
        this.old_effect_wake=op.effect_wake;
        this.old_wlength=op.wlength;
    }


//---------------------------------------------------------------------------
// USER ACTIONS                                                             -
//---------------------------------------------------------------------------
    
    $scope.clickMenu=function(strMenu) {
        if($scope.currentMenu!=strMenu) {
            this.counter=0;
            $scope.currentMenu=strMenu;
            $scope.currentSubMenu='';
            $scope.showSubMenu=false;
            RefreshDrawing();
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
                drawing.action='';
                $scope.showSubMenu=false;
                break;
            
            case 'stop':
                if(afSimulation!=null) {
                    cancelAnimationFrame(afSimulation);
                    afSimulation=null;
                }
                else if(afMovement!=null) {
                    cancelAnimationFrame(afMovement);
					clearTimeout(idTimer);
                    afMovement=null;
                }
                $scope.currentAction='';
                $scope.paused=false;
                drawing.action='';
                $scope.showSubMenu=true;
                break;
            
            case 'play':
                if(afSimulation==null && !$scope.paused) {
                    $scope.showSubMenu=true;
                    $scope.currentAction='play';
                    drawing.action='';
                    InitSimulation();
                    afSimulation=requestAnimationFrame(Simulation); //call Simulation and loops inside with another requestAnimationFrame to Simulation
                }
                break;

            case 'movement':
                if(afMovement==null && !$scope.paused) {
                    $scope.currentAction='movement';
                    StartWaveMovement();
                }
                break;
            
            case 'figure':
                $scope.showSubMenu=true;
                break;
            
            case 'lines':
                drawing.action='drawLine';
                drawing.firstLine=true;
                if(figures[figures.length-1]!='') figures.push([]);
                RefreshDrawing();
                break;
            
            case 'select':
                drawing.action='drawSelect';
                if(this.counter>1) {
                    DrawSelectNext(1);
                }
                $scope.showSubMenu=(drawing.selectedFigure!=null);
                RefreshDrawing();
                break;
            
            case 'origin':
                if($scope.showSubMenu) {
                    $scope.num_origin++;
                    if($scope.num_origin>$scope.params.origins) $scope.num_origin=1;
                    RefreshDrawing();
                }
                else {
                    $scope.showSubMenu=true;
                }
                drawing.action='setOrigin';
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
                    afSimulation=requestAnimationFrame(Simulation);
                    $scope.currentSubMenu='';
                }
                else {
                    cancelAnimationFrame(afSimulation);
                }
                $scope.paused=!$scope.paused;
                break;
            
            //Wake It (movement)
            case 'pauseMove':
                if($scope.paused) {
                    afMovement=requestAnimationFrame(WaveMovement);
                    $scope.currentSubMenu='';
                }
                else {
                    cancelAnimationFrame(afMovement);
					clearTimeout(idTimer);
                }
                $scope.paused=!$scope.paused;
                break;
            
            //lines
            case 'closed':
                if(drawing.firstLine==false) {
                    NewLine(drawing.x2,drawing.y2,drawing.xp,drawing.yp,drawing.color);
                    RefreshDrawing();
                }
                //don't break;
            case 'opened':
                $scope.currentMenu='';
                $scope.currentSubMenu='';
                $scope.showMenuLines=false;
                drawing.action='';
                RefreshDrawing();
                break;
            
            //select
            case 'move':
                drawing.action='drawSelectMove';
                break;
            
            case 'duplicate':
                if(drawing.selectedFigure!=null) {
                    DuplicateFigure(drawing.selectedFigure);
                    drawing.action='drawSelect';
                }
                break;

            case 'delete':
                if(drawing.selectedFigure!=null) {
                    DeleteFigure(drawing.selectedFigure);
                    drawing.action='drawSelect';
                }
                break;

            case 'divide':
                if(drawing.selectedFigure!=null) {
                    DivideFigure(drawing.selectedFigure);
                    drawing.action='drawSelect';
                }
                break;

            //figure
            case 'square':
            case 'hexagon':
            case 'circle':
                CreateFigure(FIGURE_SETS[strSubMenu]);
                drawing.action='';
                break;
        }
    }

//--
    $scope.toggleDialog=function(name) { 
        //show div ng-class='name'
        if(afSimulation==null && afMovement==null) {
            $scope.showDialog=( $scope.showDialog=='' ? name : '');
        }
    }   

//--
    $scope.drawingClick = function(event) {
        
        drawing.mouseX=event.offsetX;
        drawing.mouseY=event.offsetY;
        
        switch(drawing.action) {
            case 'drawLine':
                if(drawing.firstLine) {
                    drawing.x1=drawing.mouseX;
                    drawing.y1=drawing.mouseY;
                    drawing.xp=drawing.x1;
                    drawing.yp=drawing.y1;
                    drawing.firstLine=false;
                }
                else {
                    drawing.x2=drawing.mouseX;
                    drawing.y2=drawing.mouseY;
                    NewLine(drawing.x1,drawing.y1,drawing.x2,drawing.y2,drawing.color);
                    drawing.x1=drawing.x2;
                    drawing.y1=drawing.y2;
                    //after 2 lines allow user to close the figure
                    $scope.showSubMenu = figures[figures.length-1].length>1;
                }
                break;
            
            case 'drawSelect':
                drawing.selectedFigure = PointIsOnFigureLine();
                //select if point is on figure
                if(drawing.selectedFigure!=null) {
                    //remark selected figure & show move control
                    RefreshDrawing();
                    //show options
                    $scope.showSubMenu=true;
                }
                else {
                    RefreshDrawing();
                    $scope.showSubMenu=false;
                }
                break;
            
            case 'drawSelectMove':
                drawing.action='drawSelect';
                break;
            
            case 'drawSelectResize':
                drawing.action='drawSelect';
                break;
            
            case 'setOrigin':
                var i=$scope.num_origin-1;

                origins[i].x=drawing.mouseX;
                origins[i].y=YMA-drawing.mouseY;

                RefreshDrawing();
                break;
        }
    }

//--
    $scope.drawingMove = function(event) {
        $scope.drawInfo="x: "+event.offsetX+"  y: "+event.offsetY;
        switch(drawing.action) {
            case 'drawSelectMove':
                MoveFigure(drawing.selectedFigure, event.offsetX, event.offsetY);
                break;
            case 'drawLine':
                if(!drawing.firstLine) {
                    RefreshDrawing();
                    DrawLine(drawing.x1,drawing.y1,event.offsetX, event.offsetY);
                }
                break;
        }
    }

//---------------------------------------------------------------------------
// SIMULATION                                                               -
//---------------------------------------------------------------------------
    function InitSimulation() {
        
        var i, j;

        waves=[[]];
        wavesPosBuffer=[[]];

		//init waves
        for (i=0;i<op.origins;i++) {
            waves.push([]);
            for (j=0;j<op.resolution;j++) {
                waves[i].push(Object.create(particle));
            }
        }
        for (i=0;i<=op.origins;i++) {
            wavesPosBuffer.push([]);
            for (j=0;j<op.resolution;j++) {
                wavesPosBuffer[i].push(Object.create(point));
            }
            wavesPosBuffer[i].push(Object.create(point));
        }
        for (i=0;i<=op.origins;i++) {
            wavesPosBuffer[i][0].x=0;//Bmax
            wavesPosBuffer[i][0].y=i;//Wave Num (=op.origins=nextOV)
        }
    
        DrawPool();
        
        //init waves values
        for (i=0;i<op.origins;i++) {
            InitWave(i);
        }
        
        //init simulation local vars
        Simulation.colorIndex=0;
        Simulation.waveRadius=1;
        Simulation.maxWave=1;
        Simulation.attenuation=op.end_radius;
        Simulation.spiralAngle=-180; //de -180 a 179
        ExpandWaveOneStep.force=false;
    }
    
//--
    function InitWave(num) {
        var i, j, m; //float m;

        m=2*PI/op.resolution;
        for (j=0;j<op.resolution;j++) {
            waves[num][j].B=j*m; //(float)
            if(waves[num][j].B>PI) waves[num][j].B=waves[num][j].B-2*PI;
            waves[num][j].x=origins[num].x;
            waves[num][j].y=origins[num].y;
            Collision(num, j);
       }
    }

//--
    function Simulation() {
        var i;
    
        //count radius
        //Simulation.waveRadius= ++Simulation.waveRadius || 1;
        Simulation.waveRadius++;
        
        //wave reset when end_radius is reached
        if(Simulation.waveRadius>op.end_radius) {
            if (op.origins>1 && Simulation.maxWave!=op.origins) Simulation.waveRadius-=op.timelapse;
            else Simulation.waveRadius=0;
            //Simulation.maxWave= ++Simulation.maxWave || 1;
            Simulation.maxWave++;
            if(Simulation.maxWave>op.origins) Simulation.maxWave=1;
            if(!op.effect_attenuation) InitWave(Simulation.maxWave-1);
        }

        //clear only for no wake effect
        if(!op.effect_wake) {
            cpool.clearRect(0,0,$scope.POOL_WIDTH,$scope.POOL_HEIGHT);
            cpoolData= cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT);
            Simulation.colorIndex=op.wlength-(op.wlength/4)|0;//index for color_crest
        }

        //draw waves    
        for(i=0; i<op.origins; i++) {
            //start drawing after timelapse between waves
            if(Simulation.waveRadius>(op.timelapse*i)) {
                ExpandWaveOneStep(i);
                if(!op.effect_wake) {
                    DrawSingleWave(i);
                }
                else {
                    DrawWakeWave(i);
                }
            }
        }
        ExpandWaveOneStep.force=false;
        
        //put buffer on canvas
        cpool.putImageData(cpoolData, 0, 0);

        
        //change color
        Simulation.colorIndex++;
        if (Simulation.colorIndex==op.wlength) Simulation.colorIndex=0;

		//attenuation
        if(op.effect_attenuation) {
            Simulation.attenuation--;
            PaletteAttenuation();
            if(Simulation.attenuation<10) {
                $scope.currentMenu='stop';
                $scope.currentAction='';
            }
        }
        
        //stops or request next simulation frame
        if($scope.currentMenu=='stop') {
            //cancelAnimationFrame(afSimulation);
            afSimulation=null;
        }
        else {
            afSimulation=requestAnimationFrame(Simulation);
        }
    }

//--
    function ExpandWaveOneStep(iWave) {
        var O=waves[iWave];

        for(var j=0;j<op.resolution;j++) {
            if(ExpandWaveOneStep.force) {
				//search new collision
                Collision(iWave, j);
            }
            else {
				//reduces particle distance to collision
                if(O[j].M>1) O[j].M --;
                
                //particle has collisioned or not
                if (O[j].M<=1) {
					//sets particle new trayectory angle
                    O[j].B = O[j].next_B; 
					//moves particle in the new direction
                    O[j].x = O[j].Mx+Math.cos(O[j].B)/100;
                    O[j].y = O[j].My+Math.sin(O[j].B)/100;
					//search new collision
                    Collision(iWave, j);

                }    
                else {
					//moves particle
                    O[j].x += Math.cos(O[j].B);
                    O[j].y += Math.sin(O[j].B);
                }
            }
        }
 
    }

//--
    function Collision(iWave, iParticle) {
        var isOK, is2LineCollision, isPerfectAngleCollision;
        var pendiente,ra,rb,Ta,Tb,Tga,Tgb,m; //float 
        var Qax,Qay,Qbx,Qby,Pax,Pay,Pbx,Pby,Cx; //float 
        var Cp=waves[iWave][iParticle];
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

                    if(isOK) {
                        m=Math.sqrt((Qay*Qay)+((Qax-Cx)*(Qax-Cx)))-1;

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
                Cp.next_B = Calc2LineReflection(iWave, iParticle, previousLine);
            }
        }
        else {
            Cp.next_B = 360 - Cp.B*180/PI + 2 * (Cp.cd*180/PI);//reflection angle (deg)
            if(Cp.next_B >= 360) Cp.next_B-=360;
            Cp.next_B=(Cp.next_B<180 ? Cp.next_B*PI/180 : ((Cp.next_B-360)*PI/180));//to rad
        }
    }

//--
    function Calc2LineReflection(iWave, iParticle, previousLine) {
        var isOK;
        var ra,rb,Tb,Tgb; //float 
        var Qax,Qay,Qbx,Qby; //float 
        var Cp=waves[iWave][iParticle];

        var fline=figures[Cp.iFigure][Cp.iLine];

        
        Pax=fline.x0;
        Pay=fline.y0;
        Qax=previousLine.x0-Pax;
        Qay=previousLine.y0-Pay;
        Qbx=previousLine.x1-Pax;
        Qby=previousLine.y1-Pay;
     
        rb=Math.sqrt((Qbx*Qbx)+(Qby*Qby));
     
        Tb=Math.acos(Qbx/rb);
        if(Qby<0) Tb=-Tb;
        Tgb=Tb-fline.rad;

        Qby=rb*Math.sin(Tgb);
        
        closedAngle=Math.asin(Qby/previousLine.len);
        if(Qbx>Qax) closedAngle=PI/2+PI/2-closedAngle;
        if(fline.rad > (PI+previousLine.rad)) { //2nd line turn right from 1st
            closedAngle= previousLine.rad-(closedAngle/2);
        }
        else { //turn left
            closedAngle= previousLine.rad+(closedAngle/2);
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
        
        var alphaColor=(op.effect_attenuation ? Simulation.attenuation*255/op.end_radius : op.color_transparency);
        
        if(op.effect_plasma || op.effect_water || op.effect_spiral) {
            //takes arrays for nextValues and the previous values of the wave
            var prevOV,nextOV;
            for(j=0; j<=op.origins;j++) {
                if(wavesPosBuffer[j][0].y==num) prevOV=wavesPosBuffer[j];
                if(wavesPosBuffer[j][0].y==op.origins) nextOV=wavesPosBuffer[j];
            }
            //takes wave points not painted on the same coordinates
            Bmax=0;
            for(A=0;A<op.resolution;A++) {
                x=(waves[num][A].x | 0);//int
                y=YMA-(waves[num][A].y | 0);
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
                ro=virtualpalette[Simulation.colorIndex].R;
                go=virtualpalette[Simulation.colorIndex].G;
                bo=virtualpalette[Simulation.colorIndex].B;
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
                        GetPixel(x,y,coloraux);
                        coloraux.R=((coloraux.R + ro) & 255);
                        coloraux.G=((coloraux.G + go) & 255);
                        coloraux.B=((coloraux.B + bo) & 255);
                        coloraux.a=alphaColor;
                        SetPixel(x, y, coloraux);
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
                        GetPixel(x,y,coloraux);
                        //icoloralpha-frame to icolor-frame 
                        cfindex=coloraux.a-256+op.wlength;
                        if(cfindex!=NaN) {
                            if(cfindex<0 || cfindex>=op.wlength) cfindex=0; //background color
                            
                            //mix wave color with pool color, and return the icolor-frame
                            //try {
                            cfindex = Simulation.colorIndex + (Simulation.colorIndex<(op.wlength/4) || Simulation.colorIndex>=(op.wlength*3/4) ? 1 : -1) * virtualpalette[cfindex].level;
                            /*} catch(e) {
                                console.log(x+' ' +y+' '+cfindex);
                            }*/
                            if(cfindex>=op.wlength) cfindex-=op.wlength;
                            if(cfindex<0) cfindex+=op.wlength;
            
                            SetPixel(x,y, virtualpalette[cfindex|0]);
                        }
                    }
                }
            }
			else if(op.effect_spiral) {
				Simulation.spiralAngle+=2;
				if(Simulation.spiralAngle>179) Simulation.spiralAngle=-180;
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
						cfindex = Simulation.colorIndex + ((180+Simulation.spiralAngle+(B*360/Bmax))*op.wlength/360);
			    		if(cfindex>=op.wlength) {
							cfindex=cfindex-(op.wlength*((cfindex/op.wlength)|0));
			    		}

                        //coloraux.a=alphaColor;
                        SetPixel(x, y, virtualpalette[cfindex|0]);
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
            x=(waves[num][j].x | 0); //int
            y=YMA-(waves[num][j].y | 0);
            
            SetPixel(x, y, virtualpalette[Simulation.colorIndex]);
        }
    }

//--
    function StartWaveMovement() {
        var i;
        //create image buffers' array
        StartWaveMovement.framesData=[];
        for(i=0; i<op.wlength; i++) {
            StartWaveMovement.framesData.push( cpool.getImageData(0,0, $scope.POOL_WIDTH, $scope.POOL_HEIGHT) );
        }
        
        //rotate colors in each buffer
        for(i=1; i<op.wlength; i++) {
            RotateFramePalette(StartWaveMovement.framesData[i], i);
            //show progress?
        }

        //starts animation that rotates buffer showed in canvas
        afMovement=requestAnimationFrame(WaveMovement);
    }
    
//--
    function WaveMovement() {
        try {
            WaveMovement.frame = --WaveMovement.frame || 0;
            if(WaveMovement.frame<0) WaveMovement.frame=op.wlength-1;
            
            cpool.putImageData(StartWaveMovement.framesData[WaveMovement.frame], 0, 0);
            idTimer=setTimeout(function() {afMovement=requestAnimationFrame(WaveMovement);}, ANIMATION_TIME);
        }
        catch(e) {
            console.log(e);
        }
    }

//--
    function RotateFramePalette(frameData, frameIndex) {
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
    function RefreshDrawing() {
        cdrawing.clearRect(0,0,$scope.POOL_WIDTH,$scope.POOL_HEIGHT);
        DrawPool();
        if($scope.currentMenu=='origin') ShowOrigins();
    }

//--
    function DrawLine(x0,y0,x1,y1) {
        cdrawing.beginPath();
        cdrawing.moveTo(x0, y0);
        cdrawing.lineTo(x1, y1);
        cdrawing.stroke();
    }

//--
    function DrawPool() {
        cdrawing.strokeStyle = drawing.color;
        for (i in figures) {
            for(j in figures[i]) {
                DrawLine(figures[i][j].x0, YMA-figures[i][j].y0, figures[i][j].x1, YMA-figures[i][j].y1);
            }
        }
        if($scope.currentMenu=='select') {
            i=drawing.selectedFigure;
            cdrawing.strokeStyle="#fcf";
            for(j in figures[i]) {
                DrawLine(figures[i][j].x0, YMA-figures[i][j].y0, figures[i][j].x1, YMA-figures[i][j].y1);
            }
            cdrawing.strokeStyle=drawing.color;
        }

    }

//--
    function NewLine(x1, y1, x2, y2, color) {
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

            cdrawing.strokeStyle = drawing.color;
            DrawLine(x1,y1,x2,y2);

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
    
            ExpandWaveOneStep.force=true;
        }
    }

//--
    function DrawSelectNext(number) {
        if(figures.length>1) {
            if(drawing.selectedFigure==null) {
                drawing.selectedFigure=figures.length-1;
            }
            else {
                number+=drawing.selectedFigure;
                if(number>=figures.length) number=1;
                else if(number<=1) number=figures.length-1;
                drawing.selectedFigure=number;
            }
            RefreshFigureInfo(drawing.selectedFigure);
        }
    }
    
//--
    function RefreshFigureInfo(iFigure) {
        var fline=figures[iFigure][0];
        $scope.figure_size=Math.round(fline.len/fline.oLen*100);
        $scope.figure_angle=Math.round((fline.oRad-fline.rad)*180/PI);
    }
    
//--
    function PointIsOnFigureLine() {
        var ax,ay, bx,by, px,py,ph, palpha;
        for (var i=1; i<figures.length; i++) {
            for(var j in figures[i]) {
                fline=figures[i][j];
                
                //line
                ax=fline.x0;
                ay=YMA-fline.y0;
                bx=Math.abs(fline.x1-ax);
                by=Math.abs(YMA-fline.y1-ay);
                px=Math.abs(drawing.mouseX-ax);
                py=Math.abs(drawing.mouseY-ay);
                //inside line size
                if(px<=bx && py<=by) {
                    ph=Math.sqrt(px*px+py*py);                
                    palpha=(ay<drawing.mouseY ? -1 : 1)*Math.acos((drawing.mouseX-ax)/ph);
                    //near angle
                    if(Math.abs((palpha+PI)-(fline.rad+PI))<0.5) {
                        RefreshFigureInfo(i)
                        return i;
                    }
                }
            }
        }
        return null;
    }

//--
    function MoveFigure(iFigure, newX, newY) {
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
        RefreshDrawing();
        ExpandWaveOneStep.force=true;
    }

//--
    $scope.figureSize=function() {
        var endX, endY;
        var iFigure=drawing.selectedFigure;
        
        //startX y startY = point 0 figura
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
        RefreshDrawing();
        ExpandWaveOneStep.force=true;
    }
    
//--
    $scope.figureAngle=function() {
        var endX, endY;
        var iFigure=drawing.selectedFigure;
        
        //startX y startY = point 0 figura
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
        RefreshDrawing();
        ExpandWaveOneStep.force=true;
    }

//--
    function DuplicateFigure(iFigure) {
        //new figure
        if(figures[figures.length-1]!='') figures.push([]);
        iFigureNew=figures.length-1;
        //duplicate
        for(j=0; j<figures[iFigure].length; j++) {
            figures[iFigureNew].push(Object.create(figures[iFigure][j]));
        }
        //select new figure
        drawing.selectedFigure=iFigureNew;
        //move from the original position to make it visible
        MoveFigure(iFigureNew, figures[iFigureNew][0].x0+20, figures[iFigureNew][0].y0+20);
        
        RefreshDrawing();
    }

//--
    function DivideFigure(iFigure) {
        half=Math.round(figures[iFigure].length/2);
        if(half>1) {
            figures[iFigure].splice(half,half);
        }
        RefreshDrawing();
        ExpandWaveOneStep.force=true;
   }

//--
    function CreateFigure(faces) {
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
        drawing.selectedFigure=iFigureNew;
        
        RefreshDrawing();
    }

//--
    function DeleteFigure(iFigure) {
        figures.splice(iFigure,1);
        drawing.selectedFigure=null;
        DrawSelectNext(1);
        if(drawing.selectedFigure==null) $scope.showSubMenu=false;
        RefreshDrawing();
        ExpandWaveOneStep.force=true;
    }

//--
    function ShowOrigins() {
        var x,y, lon;
        var blur=cdrawing.shadowBlur;
        cdrawing.shadowBlur=1;;
        for(var i=0;i<op.origins;i++) {
            x=origins[i].x;
            y=YMA-origins[i].y;
            lon=4;
            cdrawing.strokeStyle = drawing.color;
            cdrawing.fillStyle = drawing.color;
            cdrawing.font="18px Arial";
            //selected;
            if($scope.currentMenu=='origin' && i==($scope.num_origin-1)) {
                lon=6
                cdrawing.strokeStyle = "#fcf";
                cdrawing.fillStyle = "#fcf"; 
                cdrawing.font="22px Arial";
            }
            DrawLine(x-lon,y,x+lon,y);
            DrawLine(x,y-lon,x,y+lon);
            cdrawing.textAlign=(x<($scope.POOL_WIDTH/2) ? "start" : "end"); 
            cdrawing.textBaseline=(y<($scope.POOL_HEIGHT/2) ? "top" :"bottom");
            cdrawing.fillText((i+1),x, y + (lon+2)*(y<($scope.POOL_HEIGHT/2) ? 1 : -1));
        }
        cdrawing.shadowBlur=blur;
    }

//---------------------------------------------------------------------------
// PAINT FUNCTIONS                                                          -
//---------------------------------------------------------------------------
    function SetPixel(x, y, c) {
        var index = (x + y * $scope.POOL_WIDTH) * 4;
        cpoolData.data[index] = c.R;
        cpoolData.data[index+1] = c.G;
        cpoolData.data[index+2] = c.B;
        cpoolData.data[index+3] = c.a;
    }
    
//--
    function GetPixel(x, y, c) {
        var index = (x + y * $scope.POOL_WIDTH) * 4;
        c.R=cpoolData.data[index];
        c.G=cpoolData.data[index+1];
        c.B=cpoolData.data[index+2];
        c.a=cpoolData.data[index+3];
    }

//--
/*    function GetMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
*/
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
        var alpha=Simulation.attenuation*255/op.end_radius;
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

