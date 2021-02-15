
let webcam_output;
let poseNet;
let pose;
let brain;
let skeleton;
let state = 'waiting';
let label;
let width = $(window).width()>880?880:$(window).width()
let height = width*3/4
let poseLabel
let down = false;
let workoutItems = [];
let cur
let canvas
let started =false
let finish
window.addEventListener('resize', changeDimensions);
function changeDimensions(e){
    if(e.target.innerWidth!=width ||e.target.innerHeight!=height){
        window.location.reload()
    }
    
}
async function trainData() {
    label = $('#text')[0].value
    if (label === 'save') {
        brain.saveData()
    }
    else {
        //pushup-up pushup-down squat-down squat-up
        await new Promise(resolve => setTimeout(resolve, 5000));
        state = 'collecting'
        console.log(state)
        await new Promise(resolve => setTimeout(resolve, 10000));
        state = 'waiting'
        console.log(state)

    }

}
function setup() {

    if(Cookies.get('email')){
        $('#curEmail').html(Cookies.get('email') + " is keeping you accountable!")

    }
    if(Cookies.get('previousWorkout')){
        $('#previous').html('<button class="btn-solid-lg" onclick="getPreviousWorkout()">Previous Workout</button>')
    }
    canvas=createCanvas(width, height);
    $('#defaultCanvas0').css('display','flex')

    $('#defaultCanvas0').css('margin','auto')
    $('#defaultCanvas0').css('border','10px solid #F44A87')

    webcam_output = createCapture(VIDEO);
    webcam_output.size(width, height);
    
    

    poseNet = ml5.poseNet(webcam_output, modelReady);

    poseNet.on('pose', function (results) {
        if (results.length > 0) {
            
            pose = results[0].pose
            skeleton = results[0].skeleton
            if (state === 'collecting') {
                let inputs = []
                for (let i = 0; i < pose.keypoints.length; i++) {
                    let x = pose.keypoints[i].position.x
                    let y = pose.keypoints[i].position.y
                    inputs.push(x)
                    inputs.push(y)
                }
                let target = [label]
                brain.addData(inputs, target)
            }

        }

    });
    let options = {
        inputs: 34,
        outputs: 4,
        task: 'classification',

    }
    brain = ml5.neuralNetwork(options)
    //brain.loadData('slouch.json',dataReady)
const modelInfo = {
        model: 'model/model.json',
        metadata: 'model/model_meta.json',
        weights: 'model/model.weights.bin',
    }
    /* const modelInfo = {
        model: 'model/model.slouch.json',
        metadata: 'model/model_meta.slouch.json',
        weights: 'model/model.weights.slouch.bin'
    } */
    
    brain.load(modelInfo, brainLoaded)
    //brain.loadData('full_positions.json',dataReady)

    webcam_output.hide();
}
function brainLoaded() {
    console.log('pose classification ready')
    classifyPose()
}
function classifyPose() {
    if (pose) {
        let inputs = []
        for (let i = 0; i < pose.keypoints.length; i++) {
            let x = pose.keypoints[i].position.x
            let y = pose.keypoints[i].position.y
            inputs.push(x)
            inputs.push(y)
        }
        brain.classify(inputs, gotResult)
    }
    else {
        setTimeout(classifyPose, 100)
    }

}
async function gotResult(error, results) {
    /* if(results[0].label==="slouch"){
        window.speechSynthesis.speak(new SpeechSynthesisUtterance('Stop Slouching'))
    }
    else{
        window.speechSynthesis.cancel()
    } */
    console.log(results[0].label.includes("crunch"))
    if (results&&results[0].confidence > 0.9&&workoutItems.length>0 ) {
        console.log(results)
        poseLabel = results[0].label
        let index = workoutItems.findIndex(i=>i.repsDone<i.reps)
        if(index==-1){
            cur=null
            window.speechSynthesis.speak(new SpeechSynthesisUtterance("Workout Complete"))
            /* take a screenshot */
            finish="Workout Complete"
            await new Promise(resolve => setTimeout(resolve, 1000));
            finish="3"
            await new Promise(resolve => setTimeout(resolve, 1000));
            finish="2"
            await new Promise(resolve => setTimeout(resolve, 1000));
            finish="1"
            await new Promise(resolve => setTimeout(resolve, 1000));
            finish="I'm getting fit!"
            await new Promise(resolve => setTimeout(resolve, 500));
            
            $('#workoutDone').modal('show');
            var str="<p>"
            for(var i = 0;i<workoutItems.length;i++){
                let item = workoutItems[i]
                str+=capitalizeFirstLetter(item.type)+"-"+item.reps+" reps &#10003;<br> "
                if(Cookies.get('previousWorkout')){
                    var prev = JSON.parse(Cookies.get('previousWorkout'))
                var prevReps =prev.find(e=>e.type===item.type)&&prev.find(e=>e.type===item.type).reps||0
                str+="<b>"+(item.reps>=prevReps?item.reps-prevReps +" more than last time<br>":Math.abs(prevReps-item.reps) + " less than last time <br>")+"</b>"
                }
                
            }



            str+=`</p><img style="width:100%" src="${document.getElementById('defaultCanvas0').toDataURL()}"/><h2>Keep up the great work! 💪</h2>`
            $('.modal-body').html(str)
            
            workoutItems.forEach(item=>{
                item.repsDone=0
            })
            Cookies.set('previousWorkout',JSON.stringify(workoutItems))
            $("#workouts").html("")
            const obj = {email:Cookies.get('email'), content:str}
            if(obj.email){
                fetch(window.location.origin+"/sendEmail",{
                    method:'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        },
                    body:JSON.stringify(obj)
                })
            }
           
            workoutItems=[]
            finish=""

        }
        else{
            cur=workoutItems[index]

                if (poseLabel===cur.type+"-down"&&!down) {
                    window.speechSynthesis.cancel()
                    window.speechSynthesis.speak(new SpeechSynthesisUtterance('Up'))
                    down = true
                }
                if (down &&poseLabel===cur.type+"-up") {
    
                    workoutItems[index]["repsDone"]++
                    if(workoutItems[index]["repsDone"]<workoutItems[index]["reps"]){
                        window.speechSynthesis.cancel()
                        window.speechSynthesis.speak(new SpeechSynthesisUtterance('Down'))

                    }
                   
                    down = false
                    
        
        
                }

        }
        

        

    }
    classifyPose()
}
function dataReady() {
    brain.normalizeData()
    brain.train({ epochs: 50 }, finished)
}
function finished() {
    console.log('model trained')
    brain.save()
}

function modelReady() {
console.log("model loaded")}

function draw() {
    push()
    translate(width, 0)
    scale(-1, 1)
    image(webcam_output, 0, 0, width, height);
    if (pose) {
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint.score > 0.2) {
                fill(93,173,236);
                stroke(255);

                ellipse(keypoint.position.x, keypoint.position.y, 16, 16);
            }
        }
        for (let j = 0; j < skeleton.length; j++) {
            let startPoint = skeleton[j][0];
            let endPoint = skeleton[j][1];

            strokeWeight(2);
            stroke(	244,74,135);
            line(startPoint.position.x, startPoint.position.y, endPoint.position.x, endPoint.position.y);
        }
    }
    pop();
    fill(255)
    strokeWeight(5)
    stroke(0)
    textSize(50)
    textAlign(CENTER, CENTER)
    if(cur){
        text(capitalizeFirstLetter(cur.type)+":"+(cur.reps-cur.repsDone)+" left", width / 2, height / 2)
    }
    else if(finish&&finish.length>0){
        text(finish,width/2,height/2)
    }

    else{
        text("Create Workout", width / 2, height / 2)
    }
    


}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)+"s"
  }
function addWorkoutItem() {
    if($('#reps').val().length>0){
    workoutItems.push({ type: $('#workout-type').val(), reps: $('#reps').val(),repsDone:0 })
    $('#reps').val("")
        updateWorkoutHtml()
    
    
    }
    
}
function saveEmail(){
    const email =/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if($('#email').val().match(email)){
        $('#curEmail').html($('#email').val() + " is keeping you accountable")
        Cookies.set('email', $('#email').val())
        $('#email').val("")
        
    }
    
    
}
function getPreviousWorkout(){
    workoutItems=JSON.parse(Cookies.get('previousWorkout'))
    console.log(workoutItems)
    updateWorkoutHtml()

}
function updateWorkoutHtml(){
    var str = '<tr style="background-color:#F44A87"><th>#</th><th>Workout</th><th>Repetitions</th><th>Reps Done</th></tr>'

    workoutItems.forEach(function (item,index) {
        str += '<tr><td style="background-color: white;">'+(index+1)+'</td><td>' + item.type + '</td><td>' + item.reps + '</td><td>' + item.repsDone + '</td></tr>';
    });

    $("#workouts").html(str)
}