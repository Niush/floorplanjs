//init
WALLS = [];
OBJDATA = [];
ROOM = [];
HISTORY = [];
BACKUP_HISTORY = [];
FLOORS = 1;
current_active_floor = 0; // start from 0
wallSize = 20;
partitionSize = 8;
var drag = 'off';
var action = 0;
var magnetic = 0;
var construc = 0;
var Rcirclebinder = 8;
var mode = 'select_mode';
var modeOption;
taille_w = $('#lin').width();
taille_h = $('#lin').height();
var offset = $('#lin').offset();
grid = 20;
showRib = true;
showArea = true;
meter = 60;
grid_snap = 'off';
colorbackground = "#ffffff";
colorline = "#fff";
colorroom = "#f0daaf";
colorWall = "#666";
// colorBeam = "yellow"
pox = 0;
poy = 0;
segment = 0;
xpath = 0;
ypath = 0;
var width_viewbox = taille_w;
var height_viewbox = taille_h;
var ratio_viewbox = height_viewbox / width_viewbox;
var originX_viewbox = 0;
var originY_viewbox = 0;
var zoom = 9;
var factor = 1;

// SERVICE WORKER //
window.addEventListener('load', () => {
  if('serviceWorker' in navigator){
      navigator.serviceWorker.register('./serviceworker.js', {
          scope: '/plan/',
      })
      .catch(e => {console.log(e)})
  }else{
      console.log('Service Worker will not work.')
  }
});

// **************************************************************************
// *****************   LOAD / SAVE LOCALSTORAGE      ************************
// **************************************************************************
var readonly = false;
// ****** IF READ ONLY MODE / Inside Iframe with p-data attribute *******//
// Show data and hide or disable unwanted buttons //
function checkIfReadOnly(){
  if(!window.frameElement){return false;}
  let data = window.frameElement.getAttribute("p-data");
  if(data){
    let parse_attempt = JSON.parse(data);
    if(parse_attempt && parse_attempt.data && parse_attempt.floors){
      readonly = true;
      updateFloorSelect();
      HISTORY.index = 0;
      $('#myModal').modal('hide');
      $(".leftBox *").prop('disabled',true);
      $(".back").prop('disabled',false); // not the back btn and others
      $("#floor_mode").prop('disabled',false);
      $("#floorList").prop('disabled',false);
      $("#full_mode").prop('disabled',false);
      $("#nofull_mode").prop('disabled',false);
      $("#report_mode").prop('disabled',false);
      $("#exportJson").prop('disabled',false);
      $("#boxinfo").css('left','10px');

      let to_hide = $('#panel ul li').splice(0,16);
      for(let i = 0 ; i < to_hide.length ; i++ ){
        to_hide[i].style.display = 'none';
      }
      $('#panel').css('height','30vh');
      $('#panel').css('min-height','160px');

      if (localStorage.getItem('history')) localStorage.removeItem('history');
      HISTORY.push(JSON.parse(data));
      HISTORY[0] = JSON.stringify(HISTORY[0]);
      localStorage.setItem('history', JSON.stringify(HISTORY));
      load(0);
      save();
    }
  }
}

// **** USED TO LOAD planner data if Backend is enabled **** //
// If params has id, local storage has api_url and user instance //
function checkIfBackendToLoad() {
  let params = decodeURI(window.location.search)
    .replace("?", "")
    .split("&")
    .map((param) => param.split("="))
    .reduce((values, [key, value]) => {
      values[key] = value;
      return values;
    }, {});
  if (
    params.id &&
    localStorage.getItem("api_url") &&
    localStorage.getItem("user")
  ) {
    try {
      let token = JSON.parse(localStorage.getItem("user")).access_token;
      let api_url = localStorage.getItem("api_url");
      let id = params.id;
      let data = { data: [], floors: 1 };

      fetch(api_url + "/planner/info/" + id, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + token,
        },
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (res) {
          $("#save_btn").attr("title", "Save: " + res.title);
          let parse_attempt = JSON.parse(res.data);
          if (parse_attempt && parse_attempt.data && parse_attempt.floors) {
            data = parse_attempt;
            updateFloorSelect();
            HISTORY.index = 0;
            $("#myModal").modal("hide");

            if (localStorage.getItem("history")) {
              localStorage.removeItem("history");
            }
            HISTORY.push(data);
            HISTORY[0] = JSON.stringify(HISTORY[0]);
            localStorage.setItem("history", JSON.stringify(HISTORY));
            load(0);
            save();
          }else{
            console.log("FIRST/EMPTY PLANNER EDIT")
          }
          
          $("#save_btn").on("click", function () {
            let formdata = new FormData();
            formdata.append("data", HISTORY[HISTORY.length - 1]);
            
            fetch(api_url + "/planner/update/data/" + id, {
              method: "POST",
              headers: {
                Accept: "application/json",
                Authorization: "Bearer " + token,
              },
              body: formdata
            }).then(function (r) {
              if(window.opener){
                window.opener.document.getElementById('planner_'+res.id).style.background = "#f5b363";
                window.opener.document.getElementById('planner_title_'+res.id).innerText = res.title + ' : Edited';
                window.opener.document.getElementById('planner_drawn_'+res.id).innerText = 'Yes';
              }
              $('#boxinfo').text("PLANNER SAVED SUCCESSFULLY");
              $('body').css('transition','opacity 0.3s ease');
              $('body').css('opacity','0.5');
              setTimeout(function(){
                $('body').css('opacity','1');
              }, 300);
            });
          });
          $(".loading_screen").fadeOut();
        });
    } catch {
      $(".loading_screen").fadeOut();
      $("#save_btn").remove();
    }
  }
  // If not backend required
  else {
    $(".loading_screen").fadeOut();
    $("#save_btn").remove();
  }
}

setTimeout(function(){
  checkIfReadOnly() // Delayed
}, 1000);
checkIfBackendToLoad()

function initHistory(boot = false) {
  if(localStorage.getItem('history') && boot != "recovery"){
    if(!confirm('New Data will replace old recovery data.\nAre you sure?')){
      return false;
    }
  }

  updateFloorSelect();
  $('#myModal').modal('toggle')

  HISTORY.index = 0;
  if (!boot && localStorage.getItem('history')) localStorage.removeItem('history');
    if (localStorage.getItem('history') && boot == "recovery") {
      var historyTemp = JSON.parse(localStorage.getItem('history'));
      HISTORY.push(historyTemp[historyTemp.length - 1]);
      load(HISTORY.length-1, "boot");
    }
    if (boot == "newSquare") {
      if (localStorage.getItem('history')) localStorage.removeItem('history');
      HISTORY.push({"data":[{"objData":[],"wallData":[{"thick":20,"start":{"x":540,"y":194},"end":{"x":540,"y":734},"type":"normal","parent":3,"child":1,"angle":1.5707963267948966,"equations":{"up":{"A":"v","B":550},"down":{"A":"v","B":530},"base":{"A":"v","B":540}},"coords":[{"x":550,"y":204},{"x":530,"y":184},{"x":530,"y":744},{"x":550,"y":724}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":540,"y":734},"end":{"x":1080,"y":734},"type":"normal","parent":0,"child":2,"angle":0,"equations":{"up":{"A":"h","B":724},"down":{"A":"h","B":744},"base":{"A":"h","B":734}},"coords":[{"x":550,"y":724},{"x":530,"y":744},{"x":1090,"y":744},{"x":1070,"y":724}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":1080,"y":734},"end":{"x":1080,"y":194},"type":"normal","parent":1,"child":3,"angle":-1.5707963267948966,"equations":{"up":{"A":"v","B":1070},"down":{"A":"v","B":1090},"base":{"A":"v","B":1080}},"coords":[{"x":1070,"y":724},{"x":1090,"y":744},{"x":1090,"y":184},{"x":1070,"y":204}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":1080,"y":194},"end":{"x":540,"y":194},"type":"normal","parent":2,"child":0,"angle":3.141592653589793,"equations":{"up":{"A":"h","B":204},"down":{"A":"h","B":184},"base":{"A":"h","B":194}},"coords":[{"x":1070,"y":204},{"x":1090,"y":184},{"x":530,"y":184},{"x":550,"y":204}],"graph":{"0":{},"context":{},"length":1}}],"roomData":[{"coords":[{"x":540,"y":734},{"x":1080,"y":734},{"x":1080,"y":194},{"x":540,"y":194},{"x":540,"y":734}],"coordsOutside":[{"x":1090,"y":744},{"x":1090,"y":184},{"x":530,"y":184},{"x":530,"y":744},{"x":1090,"y":744}],"coordsInside":[{"x":1070,"y":724},{"x":1070,"y":204},{"x":550,"y":204},{"x":550,"y":724},{"x":1070,"y":724}],"inside":[],"way":["0","2","3","1","0"],"area":270400,"surface":"","name":"","color":"gradientWhite","showSurface":true,"action":"add"}]}], "floors":1});
      HISTORY[0] = JSON.stringify(HISTORY[0]);
      localStorage.setItem('history', JSON.stringify(HISTORY));
      load(0);
      save();
    }
    if (boot == "newL") {
      if (localStorage.getItem('history')) localStorage.removeItem('history');
      HISTORY.push({"data":[{"objData":[],"wallData":[{"thick":20,"start":{"x":447,"y":458},"end":{"x":447,"y":744},"type":"normal","parent":5,"child":1,"angle":1.5707963267948966,"equations":{"up":{"A":"v","B":457},"down":{"A":"v","B":437},"base":{"A":"v","B":447}},"coords":[{"x":457,"y":468},{"x":437,"y":448},{"x":437,"y":754},{"x":457,"y":734}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":447,"y":744},"end":{"x":1347,"y":744},"type":"normal","parent":0,"child":2,"angle":0,"equations":{"up":{"A":"h","B":734},"down":{"A":"h","B":754},"base":{"A":"h","B":744}},"coords":[{"x":457,"y":734},{"x":437,"y":754},{"x":1357,"y":754},{"x":1337,"y":734}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":1347,"y":744},"end":{"x":1347,"y":144},"type":"normal","parent":1,"child":3,"angle":-1.5707963267948966,"equations":{"up":{"A":"v","B":1337},"down":{"A":"v","B":1357},"base":{"A":"v","B":1347}},"coords":[{"x":1337,"y":734},{"x":1357,"y":754},{"x":1357,"y":134},{"x":1337,"y":154}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":1347,"y":144},"end":{"x":1020,"y":144},"type":"normal","parent":2,"child":4,"angle":3.141592653589793,"equations":{"up":{"A":"h","B":154},"down":{"A":"h","B":134},"base":{"A":"h","B":144}},"coords":[{"x":1337,"y":154},{"x":1357,"y":134},{"x":1010,"y":134},{"x":1030,"y":154}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":1020,"y":144},"end":{"x":1020,"y":458},"type":"normal","parent":3,"child":5,"angle":1.5707963267948966,"equations":{"up":{"A":"v","B":1030},"down":{"A":"v","B":1010},"base":{"A":"v","B":1020}},"coords":[{"x":1030,"y":154},{"x":1010,"y":134},{"x":1010,"y":448},{"x":1030,"y":468}],"graph":{"0":{},"context":{},"length":1}},{"thick":20,"start":{"x":1020,"y":458},"end":{"x":447,"y":458},"type":"normal","parent":4,"child":0,"angle":3.141592653589793,"equations":{"up":{"A":"h","B":468},"down":{"A":"h","B":448},"base":{"A":"h","B":458}},"coords":[{"x":1030,"y":468},{"x":1010,"y":448},{"x":437,"y":448},{"x":457,"y":468}],"graph":{"0":{},"context":{},"length":1}}],"roomData":[{"coords":[{"x":447,"y":744},{"x":1347,"y":744},{"x":1347,"y":144},{"x":1020,"y":144},{"x":1020,"y":458},{"x":447,"y":458},{"x":447,"y":744}],"coordsOutside":[{"x":1357,"y":754},{"x":1357,"y":134},{"x":1010,"y":134},{"x":1010,"y":448},{"x":437,"y":448},{"x":437,"y":754},{"x":1357,"y":754}],"coordsInside":[{"x":1337,"y":734},{"x":1337,"y":154},{"x":1030,"y":154},{"x":1030,"y":468},{"x":457,"y":468},{"x":457,"y":734},{"x":1337,"y":734}],"inside":[],"way":["0","2","3","4","5","1","0"],"area":330478,"surface":"","name":"","color":"gradientWhite","showSurface":true,"action":"add"}]}], floors: 1});
      HISTORY[0] = JSON.stringify(HISTORY[0]);
      localStorage.setItem('history', JSON.stringify(HISTORY));
      load(0);
      save();
    }
}

// IMPORT JSON FILE
function importPlan(){
  var files = document.getElementById('importfile').files;
  if (files.length <= 0) {
    alert('Upload Valid Plan Data in .json Format')
  }

  var reader = new FileReader();
  reader.onload = function(event){
    try{
      var obj = JSON.parse(event.target.result);
      if(obj.constructor !== ({}).constructor){
        alert('JSON is not a valid Plan Type')
        return;
      }
      
      HISTORY.push(obj);
      console.log(HISTORY)
      HISTORY[0] = JSON.stringify(HISTORY[0]);
      HISTORY.index = 0;
      localStorage.setItem('history', JSON.stringify(HISTORY));
      load(0);
      save();
      console.log(HISTORY)

      $('#myModal').modal('toggle')
    }catch(e){
      console.log(e)
      alert('Invalid File Provided');
    }
  };
  reader.readAsText(files[0]);
}

document.getElementById('redo').addEventListener("click", function() {
  if (HISTORY.index < HISTORY.length) {
    load(HISTORY.index);
    HISTORY.index++;
    $('#undo').removeClass('disabled');
    if (HISTORY.index == HISTORY.length) {
      $('#redo').addClass('disabled');
    }
  }
});

document.getElementById('undo').addEventListener("click", function() {
  if (HISTORY.index > 0) {
    $('#undo').removeClass('disabled');
    if (HISTORY.index-1 >0) {
      HISTORY.index--;
      load(HISTORY.index-1);
      $('#redo').removeClass('disabled');
    }
  }
  if (HISTORY.index == 1) $('#undo').addClass('disabled');
});


document.getElementById('exportJson').addEventListener("click", function() {
  if (localStorage.getItem('history')) {
    var data = JSON.parse(localStorage.getItem('history'));
    data = JSON.parse(data[data.length-1]);
    // for wall data
    var total_wall_length = 0
    var wall_length_floor = 0
    var total_damage_wall = 0
    var total_demolish_wall = 0
    var wall_length_x_floor = 0
    var wall_length_y_floor = 0
    var total_wall_length_x_floor = 0
    var total_wall_length_y_floor = 0
    var tempData = data.data
    for(let i = 0; i < tempData.length; i++){
      wall_length_floor = 0
      wall_length_x_floor = 0
      wall_length_y_floor = 0
      for(let j = 0; j < tempData[i].wallData.length; j++){
        total_wall_length += parseFloat(tempData[i].wallData[j].wall_length)
        wall_length_floor += parseFloat(tempData[i].wallData[j].wall_length)

        total_wall_length_x_floor += parseFloat(tempData[i].wallData[j].wall_length_x)
        total_wall_length_y_floor += parseFloat(tempData[i].wallData[j].wall_length_y)

        wall_length_x_floor += parseFloat(tempData[i].wallData[j].wall_length_x)
        wall_length_y_floor += parseFloat(tempData[i].wallData[j].wall_length_y)

        if(tempData[i].wallData[j].damage && (tempData[i].wallData[j].damage == 'medium' || tempData[i].wallData[j].damage == 'high')){
          total_damage_wall += parseFloat(tempData[i].wallData[j].wall_length)
        }
        
        if(tempData[i].wallData[j].demolish && (tempData[i].wallData[j].demolish == 'yes')){
          total_demolish_wall += parseFloat(tempData[i].wallData[j].wall_length)
        }
      }
      data.data[i]['wall_length_floor'] = wall_length_floor.toFixed(2)
      data.data[i]['wall_length_x_floor'] = wall_length_x_floor.toFixed(2)
      data.data[i]['wall_length_y_floor'] = wall_length_y_floor.toFixed(2)
    }

    data['total_wall_length'] = total_wall_length.toFixed(2)
    data['total_damage_wall'] = total_damage_wall.toFixed(2)
    data['total_demolish_wall'] = total_demolish_wall.toFixed(2)
    data['total_wall_length_x_floor'] = total_wall_length_x_floor.toFixed(2)
    data['total_wall_length_y_floor'] = total_wall_length_y_floor.toFixed(2)

    
    // console.log(total_wall_length, total_damage_wall, total_demolish_wall)
    const filename = 'plan-data-' + new Date().getTime() + '.json';
    const jsonStr = JSON.stringify(data);

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }else{
    alert('No Plan Data available to Export')
  }
})

document.addEventListener('keydown', function(event) {
  // Undo
  if (event.ctrlKey && event.key === 'z') {
    document.getElementById('undo').click();
    save()
  }

  // Redo
  if (event.ctrlKey && event.key === 'y') {
    document.getElementById('redo').click();
    save()
  }

  // Ignore Select All
  if (event.ctrlKey && event.key === 'a') {
    if(event.target.type != 'input' && event.target.type != 'textarea' 
      && event.target.getAttribute('contenteditable') != 'true'
      && mode != "text_mode"){
        event.preventDefault();
    }
  }

  // Save ctrl+s overrides by exporting json
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    document.getElementById('exportJson').click();
  }

  // Escape ignore all and go to pointer (select mode)
  if (event.key === 'Escape') {
    editor.architect(WALLS);
    mode = "select_mode";
    if(typeof binder !== 'undefined' && binder && typeof binder.update === "function"){
      binder.update();
    }
    $('#panel').show(200);
    $('#select_mode').click();
    $('#linetemp').remove();
    $('#line_construc').remove();
    if(typeof lengthTemp !== 'undefined' && lengthTemp){
      lengthTemp.remove();
      delete lengthTemp;
    }
    if(typeof binder !== 'undefined' && binder.class == "measure"){
      // Remove the cross of measure + yellow helper //
      cross[0].remove();
    }
  }

  // Delete
  if (event.key === 'Delete') {
    if(typeof binder !== 'undefined' && binder){
      if(binder.obj){
        document.getElementById('bboxTrash').click(); // box items
      }
      else if(binder.wall){
        document.getElementById('wallTrash').click(); // wall
      }
    }
  }
});

// document.addEventListener('contextmenu', function(e) {
//   e.preventDefault();
// }, false);

function themeSwitch(){
  if(!document.documentElement.style.filter || document.documentElement.style.filter === ''){
    document.documentElement.style.filter = 'invert(1)';
    localStorage.setItem('dark','true');
  }else{
    document.documentElement.style.filter = '';
    localStorage.setItem('dark','false');
  }
}

if(localStorage.getItem('dark') && localStorage.getItem('dark') == 'true'){
  document.documentElement.style.filter = 'invert(1)';
}

// ******************************** //
// Save changes to History Function //
// ******************************** //
function save(boot = false) {
  // if (boot) localStorage.removeItem('history');
  // FOR CYCLIC OBJ INTO LOCALSTORAGE !!!

  let d = JSON.parse(localStorage.getItem('history'));
  // console.log(d)
  if(d && d.length > 0) d=JSON.parse(d[d.length - 1]);
  if(d && d.data && d.data.length > 0){
    BACKUP_HISTORY = JSON.parse(localStorage.getItem('history'));
  }else{
    // console.log(BACKUP_HISTORY)
    localStorage.setItem('history', JSON.stringify(BACKUP_HISTORY));
  }

  // console.log(JSON.parse(localStorage.getItem('history')))
  for (var k in WALLS) {
    // console.log(WALLS[k].start, WALLS[k].end)
    if (WALLS[k].child != null) WALLS[k].child = WALLS.indexOf(WALLS[k].child);
    if (WALLS[k].parent != null) WALLS[k].parent = WALLS.indexOf(WALLS[k].parent);
    
  }
  if (HISTORY[HISTORY.length-1] && JSON.stringify({objData: OBJDATA, wallData: WALLS, roomData: ROOM}) == JSON.stringify(JSON.parse(HISTORY[HISTORY.length-1]).data[current_active_floor])) {
    for (var k in WALLS) {
      if (WALLS[k].child != null) WALLS[k].child = WALLS[WALLS[k].child];
      if (WALLS[k].parent != null) WALLS[k].parent = WALLS[WALLS[k].parent];
    }
    return false;
  }

  if (HISTORY.index < HISTORY.length) {
    HISTORY.splice(HISTORY.index, (HISTORY.length - HISTORY.index));
    $('#redo').addClass('disabled');
  }

  // append and create data...
  var data = [];
  var currentPushed = false;
  var toLoad = HISTORY.index < HISTORY.length ? HISTORY.index : HISTORY.index - 1;
  if(toLoad < 0){toLoad = 0}
  if(HISTORY.length && JSON.parse(HISTORY[toLoad]).data.length <= 0){
    if(localStorage.getItem('history')){
      var historyTemp = JSON.parse(localStorage.getItem('history'));
      if(historyTemp && historyTemp.length > 0){
        HISTORY.push(historyTemp[historyTemp.length - 1]);
        HISTORY.index = HISTORY.length - 1;
        toLoad = HISTORY.index;
      }else{
        toLoad = 0;
      }
    }else{
      toLoad = 0;
    }
  }

  if(HISTORY.length){
    // console.log(HISTORY)
    // console.log(toLoad)
    var historyTemp = JSON.parse(HISTORY[toLoad]);
    // console.log(historyTemp)
    var floor_data = historyTemp.data;
    
    for(var i = 0 ; i < FLOORS ; i++){
      if(i == parseInt(current_active_floor)){
        data.push({objData: OBJDATA, wallData: WALLS, roomData: ROOM});
        currentPushed = true;
      }else{
        // console.log(floor_data);
        // console.log(floor_data[i]);
        data.push(floor_data[i]);
      }
    }
    if(!currentPushed){
      data.push({objData: OBJDATA, wallData: WALLS, roomData: ROOM});
    }
  }
  //
  HISTORY.push(JSON.stringify({data: data, floors: FLOORS}));
  localStorage.setItem('history', JSON.stringify(HISTORY));
  HISTORY.index++;
  if (HISTORY.index>1) $('#undo').removeClass('disabled');
  for (var k in WALLS) {
    if (WALLS[k].child != null) WALLS[k].child = WALLS[WALLS[k].child];
    if (WALLS[k].parent != null) WALLS[k].parent = WALLS[WALLS[k].parent];
  }
  return true;
}

// ********************************** //
// Load changes from History Function //
// ********************************** //
function load(index = HISTORY.index, boot = false, runtimeFloors = false) {
  if (HISTORY.length == 0 && !boot) return false;
  for (var k in OBJDATA){
    OBJDATA[k].graph.remove();
  }
  OBJDATA = [];
  var historyTemp = [];
  // historyTemp = JSON.parse(localStorage.getItem('history'));
  // console.log(historyTemp)
  // historyTemp = JSON.parse(historyTemp[index]);
  if(index || index == 0 || !HISTORY.index){
    // console.log(HISTORY)
    if(isNaN(index)){
      index = 0;
    }
    // console.log(index)
    historyTemp = JSON.parse(HISTORY[index]);
  }else{
    // console.log(HISTORY)
    // console.log(index)
    historyTemp = JSON.parse(HISTORY[(HISTORY.index < HISTORY.length ? HISTORY.index : HISTORY.index - 1)]);
  }
  // console.log(historyTemp)
  var floors = historyTemp.floors;
  historyTemp = historyTemp.data[current_active_floor];
  // console.log(historyTemp)

  // IF NO HISTORY TEMP FOR IS EMPTY (e.g. NO CASE OF NEW ADDED FLOOR)
  if(!historyTemp){
    WALLS = []
    ROOM = []
  }else{
    // IF data exists //
    for (var k in historyTemp.objData) {
      var OO = historyTemp.objData[k];
      // if (OO.family == 'energy') OO.family = 'byObject';
      var fill = OO.fill ? OO.fill : '#eee';
      var obj = new editor.obj2D(OO.family, OO.class, OO.type, {x: OO.x, y: OO.y}, OO.angle, OO.angleSign, OO.size, OO.hinge = 'normal', OO.thick, OO.value, fill);
      obj.limit = OO.limit;
      obj.demolish = OO.demolish;
      obj.typeDoorWindow = OO.typeDoorWindow
      obj.sillHeight = OO.sillHeight
      obj.columnHeight = OO.columnHeight
      obj.height = OO.height
      obj.typeColumn = OO.typeColumn
      obj.typeStair = OO.typeStair
      OBJDATA.push(obj);
      $('#boxcarpentry').append(OBJDATA[OBJDATA.length-1].graph);
      obj.update();
      // console.log(OBJDATA)
    }
    WALLS = historyTemp.wallData;
    for (var k in WALLS) {
      if (WALLS[k].child != null) WALLS[k].child = WALLS[WALLS[k].child];
      if (WALLS[k].parent != null) WALLS[k].parent = WALLS[WALLS[k].parent];
    }
    ROOM = historyTemp.roomData;
  }

  FLOORS = runtimeFloors ? FLOORS : floors;
  editor.architect(WALLS);
  editor.showScaleBox();
  updateFloorSelect();
  rib();
}

$('svg').each(function() {
  if(originX_viewbox >= 0 && originY_viewbox >= 0 && width_viewbox >= 0 && height_viewbox >= 0){
    $(this)[0].setAttribute('viewBox', originX_viewbox + ' ' + originY_viewbox + ' ' + width_viewbox + ' ' + height_viewbox)
  }
});

// **************************************************************************
// *****************   FUNCTIONS ON BUTTON click     ************************
// **************************************************************************

function updateFloorSelect(goto){
  var floorListSelect = document.getElementById('floorList');
  var selected = floorListSelect.value;
  floorListSelect.innerHTML = '';
  for(var i = 0 ; i < FLOORS ; i++){
    var option = document.createElement('option');
    option.value = i;
    option.innerText = 'Floor '+i;
    floorListSelect.appendChild(option);
  }
  if(goto){
    floorListSelect.value = goto;
    current_active_floor = parseInt(goto);
  }else{
    floorListSelect.value = selected;
    current_active_floor = parseInt(selected);
  }

  if(isNaN(current_active_floor)){
    current_active_floor = 0;
  }
  
  if(!floorListSelect.value){
    floorListSelect.value = 0;
  }
}

document.getElementById('floorAdd').addEventListener("click", function(){
  if(FLOORS < 10){
    FLOORS += 1;
    updateFloorSelect();
  }
})

document.getElementById('deleteCurrentFloor').addEventListener("click", function(){
  // TODO (may be ok): still very buggy (not removing from history (ie. not saving changes))
  if(FLOORS > 1){
    FLOORS -= 1;

    let this_history = HISTORY.length - 1;
    if(HISTORY.index && HISTORY.index < HISTORY.length){
      this_history = HISTORY.index;
    }
    let history = JSON.parse(HISTORY[this_history]);
    history.data.pop(current_active_floor);
    if(history.floors > 1){
      history.floors -= 1;
    }
    // console.log(history)
    HISTORY.push(JSON.stringify(history));
    HISTORY.index = HISTORY.length - 1;
    // console.log(JSON.stringify([JSON.stringify(history)]));
    localStorage.setItem('history', JSON.stringify([JSON.stringify(history)]));
    // console.log(HISTORY)

    updateFloorSelect(0);
    document.getElementById('floorList').dispatchEvent(new Event('change'))
  }
})

document.getElementById('floorList').addEventListener("change", function(){
  // SHADOW HELPER FOR FLOOR //
  $('#shadowlin').remove();
  var cloned_shadow = document.getElementById('lin').cloneNode('deep');
  cloned_shadow.style.opacity = '0.1';
  cloned_shadow.style.pointerEvents = 'none';
  cloned_shadow.setAttribute('id','shadowlin');
  document.body.append(cloned_shadow);

  current_active_floor = parseInt(document.getElementById('floorList').value);
  var toLoad = HISTORY.index < HISTORY.length ? HISTORY.index : HISTORY.index - 1;
  load(toLoad, false, true);
})

// REPORT (contains export button also)
document.getElementById('report_mode').addEventListener("click", function() {
  if (typeof(globalArea) == "undefined") return false;
  mode = "report_mode";
  $('#panel').hide();
  $('#reportTools').show(200, function() {
    document.getElementById('reportTotalSurface').innerHTML = "Total Area : <b>"+(globalArea/3600).toFixed(1)+ "</b> m²";
    $('#reportTotalSurface').show(500);
    document.getElementById('reportNumberSurface').innerHTML = "Number of rooms : <b>"+ROOM.length+ "</b>";
    $('#reportNumberSurface').show(500);
    var number = 1;
    var reportRoom = '<div class="row">\n';
    for (var k in ROOM) {
      var nameRoom = "Room n°"+number+" <small>(nameless)</small>";
      if (ROOM[k].name != "") nameRoom = ROOM[k].name;
      reportRoom+= '<div class="col-md-6"><p>'+nameRoom+'</p></div>\n';
      reportRoom+= '<div class="col-md-6"><p>Surface : <b>'+((ROOM[k].area)/3600).toFixed(2)+'</b> m²</p></div>\n';
      number++;
    }
    reportRoom+='</div><hr/>\n';
    reportRoom+='<div>\n';
    var switchNumber = 0;
    var plugNumber = 0;
    var lampNumber = 0;
    for (var k in OBJDATA) {
      if (OBJDATA[k].class == 'energy') {
        if (OBJDATA[k].type == 'switch' || OBJDATA[k].type == 'doubleSwitch' || OBJDATA[k].type == 'dimmer') switchNumber++;
        if (OBJDATA[k].type == 'plug' || OBJDATA[k].type == 'plug20' || OBJDATA[k].type == 'plug32') plugNumber++;
        if (OBJDATA[k].type == 'wallLight' || OBJDATA[k].type == 'roofLight') lampNumber++;
      }
    }
    reportRoom+='<p>Number of switch (s) : '+switchNumber+'</p>';
    reportRoom+='<p>Number of outlet (s) : '+plugNumber+'</p>';
    reportRoom+='<p>Number of lamps (s) : '+lampNumber+'</p>';
    reportRoom+='</div>';
    reportRoom+='<div>\n';
    reportRoom+='<h2>Energy distribution per room</h2>\n';
    var number = 1;
    reportRoom+= '<div class="row">\n';
    reportRoom+= '<div class="col-md-4"><p>Room</p></div>\n';
    reportRoom+= '<div class="col-md-2"><small>Switch</small></div>\n';
    reportRoom+= '<div class="col-md-2"><small>Outlet</small></div>\n';
    reportRoom+= '<div class="col-md-2"><small>Lamps</small></div>\n';
    reportRoom+= '<div class="col-md-2"><small>Watts Max</small></div>\n';
    reportRoom+='</div>';

    var roomEnergy = [];
    for (var k in ROOM) {
      reportRoom+= '<div class="row">\n';
      var nameRoom = "Room n°"+number+" <small>(nameless)</small>";
      if (ROOM[k].name != "") nameRoom = ROOM[k].name;
      reportRoom+= '<div class="col-md-4"><p>'+nameRoom+'</p></div>\n';
      var switchNumber = 0;
      var plugNumber = 0;
      var plug20 = 0;
      var plug32 = 0;
      var lampNumber = 0;
      var wattMax = 0;
      var plug = false;
      for (var i in OBJDATA) {
        if (OBJDATA[i].class == 'energy') {
          if (OBJDATA[i].type == 'switch' || OBJDATA[i].type == 'doubleSwitch' || OBJDATA[i].type == 'dimmer') {
            if (roomTarget = editor.rayCastingRoom(OBJDATA[i])) {
              if (isObjectsEquals(ROOM[k], roomTarget)) switchNumber++;
            }
          }
          if (OBJDATA[i].type == 'plug' || OBJDATA[i].type == 'plug20' || OBJDATA[i].type == 'plug32') {
            if (roomTarget = editor.rayCastingRoom(OBJDATA[i])) {
              if (isObjectsEquals(ROOM[k], roomTarget)) {
                plugNumber++;
                if (OBJDATA[i].type == 'plug' && !plug) {wattMax+=3520;plug = true;}
                if (OBJDATA[i].type == 'plug20') {wattMax+=4400;plug20++;}
                if (OBJDATA[i].type == 'plug32') {wattMax+=7040;plug32++;}
              }
            }
          }
          if (OBJDATA[i].type == 'wallLight' || OBJDATA[i].type == 'roofLight') {
            if (roomTarget = editor.rayCastingRoom(OBJDATA[i])) {
              if (isObjectsEquals(ROOM[k], roomTarget)) {
              lampNumber++;
               wattMax+=100;
              }
            }
          }
        }
      }
      roomEnergy.push({switch: switchNumber, plug: plugNumber, plug20: plug20, plug32: plug32, light: lampNumber});
      reportRoom+= '<div class="col-md-2"><b>'+switchNumber+'</b></div>\n';
      reportRoom+= '<div class="col-md-2"><b>'+plugNumber+'</b></div>\n';
      reportRoom+= '<div class="col-md-2"><b>'+lampNumber+'</b></div>\n';
      reportRoom+= '<div class="col-md-2"><b>'+wattMax+'</b></div>\n';
      number++;
      reportRoom+='</div>';
    }
    reportRoom+='<hr/><h2>Details Standard NF C 15-100</h2>\n';
    var number = 1;

    for (var k in ROOM) {
      reportRoom+= '<div class="row">\n';
      var nfc = true;
      var nameRoom = "Room n°"+number+" <small>(nameless)</small>";
      if (ROOM[k].name != "") nameRoom = ROOM[k].name;
      reportRoom+= '<div class="col-md-4"><p>'+nameRoom+'</p></div>\n';
      if (ROOM[k].name == "") {
        reportRoom+= '<div class="col-md-8"><p><i class="fa fa-ban" aria-hidden="true" style="color:red"></i> Because the room has no label, Floor Plan Application cannot provide you with information.</p></div>\n';
      }
      else {
        if (ROOM[k].name == "Salon") {
          for (var g in ROOM) {
            if (ROOM[g].name == "Salle à manger") {
              roomEnergy[k].light+=roomEnergy[g].light;
              roomEnergy[k].plug+=roomEnergy[g].plug;
              roomEnergy[k].switch+=roomEnergy[g].switch;
            }
          }
          reportRoom+= '<div class="col-md-8">';
          if (roomEnergy[k].light == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> This room must have at least <b> 1 controlled light point </b> <small>(currently '+roomEnergy[k].light+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug < 5) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> This room must have at least <b> 5 power outlets</b> <small>(currently '+roomEnergy[k].plug+')</small>.</p>\n';nfc=false;}
          if (nfc) reportRoom+='<i class="fa fa-check" aria-hidden="true" style="color:green"></i>';
          reportRoom+= '</div>';
        }
        if (ROOM[k].name == "Salle à manger") {
          reportRoom+= '<div class="col-md-8"><p><i class="fa fa-info" aria-hidden="true" style="color:blue"></i> Cette pièce est liée au <b>salon / séjour</b> selon la norme.</p></div>\n';
        }
        if (ROOM[k].name.substr(0,7) == "Chambre") {
          reportRoom+= '<div class="col-md-8">';
          if (roomEnergy[k].light == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 point lumineux commandé</b> <small>(actuellement '+roomEnergy[k].light+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug < 3) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>3 prises de courant</b> <small>(actuellement '+roomEnergy[k].plug+')</small>.</p>\n';nfc=false;}
          if (nfc) reportRoom+='<i class="fa fa-check" aria-hidden="true" style="color:green"></i>';
          reportRoom+= '</div>';
        }
        if (ROOM[k].name == "SdB") {
          reportRoom+= '<div class="col-md-8">';
          if (roomEnergy[k].light == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 point lumineux</b> <small>(actuellement '+roomEnergy[k].light+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug < 2) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>2 prises de courant</b> <small>(actuellement '+roomEnergy[k].plug+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].switch == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 interrupteur</b> <small>(actuellement '+roomEnergy[k].switch+')</small>.</p>\n';nfc=false;}
          if (nfc) reportRoom+='<i class="fa fa-check" aria-hidden="true" style="color:green"></i>';
          reportRoom+= '</div>';
        }
        if (ROOM[k].name == "Couloir") {
          reportRoom+= '<div class="col-md-8">';
          if (roomEnergy[k].light == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 point lumineux commandé</b> <small>(actuellement '+roomEnergy[k].light+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug < 1) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 prise de courant</b> <small>(actuellement '+roomEnergy[k].plug+')</small>.</p>\n';nfc=false;}
          if (nfc) reportRoom+='<i class="fa fa-check" aria-hidden="true" style="color:green"></i>';
          reportRoom+= '</div>';
        }
        if (ROOM[k].name == "Toilette") {
          reportRoom+= '<div class="col-md-8">';
          if (roomEnergy[k].light == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 point lumineux</b>. <small>(actuellement '+roomEnergy[k].light+')</small>.</p>\n';nfc=false;}
          if (nfc) reportRoom+='<i class="fa fa-check" aria-hidden="true" style="color:green"></i>';
          reportRoom+= '</div>';
        }
        if (ROOM[k].name == "Cuisine") {
          reportRoom+= '<div class="col-md-8">';
          if (roomEnergy[k].light == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 point lumineux commandé</b> <small>(actuellement '+roomEnergy[k].light+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug < 6) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>6 prise de courant</b> <small>(actuellement '+roomEnergy[k].plug+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug32 == 0) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>1 prise de courant 32A</b> <small>(actuellement '+roomEnergy[k].plug32+')</small>.</p>\n';nfc=false;}
          if (roomEnergy[k].plug20 < 2) {reportRoom+= '<p><i class="fa fa-exclamation-triangle" style="color:orange" aria-hidden="true"></i> Cette pièce doit disposer d\'au moins <b>2 prise de courant 20A</b> <small>(actuellement '+roomEnergy[k].plug20+')</small>.</p>\n';nfc=false;}
          if (nfc) reportRoom+='<i class="fa fa-check" aria-hidden="true" style="color:green"></i>';
          reportRoom+= '</div>';
        }
      }
      number++;
      reportRoom+='</div>';
    }

    document.getElementById('reportRooms').innerHTML = reportRoom;
    $('#reportRooms').show(500);
  });


});

// Wall Width
document.getElementById('wallWidth').addEventListener("input", function() {
  var sliderValue = this.value;
  binder.wall.thick = sliderValue;
  binder.wall.type = "normal";
  editor.architect(WALLS);
  var objWall = editor.objFromWall(binder.wall); // LIST OBJ ON EDGE
  for (var w = 0; w < objWall.length; w++) {
    objWall[w].thick = sliderValue;
    objWall[w].update();
  }
  rib();
  document.getElementById("wallWidthVal").textContent = sliderValue;
});

// Wall Height
document.getElementById('wallHeight').addEventListener("input", function(){
  var heightValue = this.value
  binder.wall.height = heightValue
  document.getElementById("wallHeightVal").textContent = heightValue;
})

// Roof / Ridge Height
document.getElementById('roofHeightStart').addEventListener("input", function(){
  binder.wall.roofHeightStart = this.value
  document.getElementById("roofHeightStartVal").textContent = this.value;
  $('#boxinfo').text('Ridge Height Start Changed');
  binder.wall.graph[0].style.opacity = 0
  setTimeout(function(){
    binder.wall.graph[0].style.opacity = 1
  }, 200)
})
document.getElementById('roofHeightEnd').addEventListener("input", function(){
  binder.wall.roofHeightEnd = this.value
  document.getElementById("roofHeightEndVal").textContent = this.value;
  $('#boxinfo').text('Ridge Height End Changed');
  binder.wall.graph[0].style.opacity = 0
  setTimeout(function(){
    binder.wall.graph[0].style.opacity = 1
  }, 200)
})

// Trash box, items (not wall) button
document.getElementById("bboxTrash").addEventListener("click", function () {
  binder.obj.graph.remove();
  binder.graph.remove();
  OBJDATA.splice(OBJDATA.indexOf(binder.obj), 1);
  $('#objBoundingBox').hide(100);
  $('#panel').show(200);
  fonc_button('select_mode');
  $('#boxinfo').html('Object deleted');
  delete binder;
  rib();
});

// Steps Add in Staircase
document.getElementById("bboxStepsAdd").addEventListener("click", function () {
  var newValue = document.getElementById("bboxStepsVal").textContent;
  if (newValue < 15) {
    newValue++;
    binder.obj.value  = newValue;
    binder.obj.update();
    document.getElementById("bboxStepsVal").textContent = newValue;
  }
});

// Steps Minus in Staircase
document.getElementById("bboxStepsMinus").addEventListener("click", function () {
  var newValue = document.getElementById("bboxStepsVal").textContent;
  if (newValue > 2) {
    newValue--;
    binder.obj.value  = newValue;
    binder.obj.update();
    document.getElementById("bboxStepsVal").textContent = newValue;
  }
});

// Update width of items
document.getElementById('bboxWidth').addEventListener("input", function() {
  var sliderValue = this.value;
  binder.obj.size  = (sliderValue / 100) * meter;
  binder.obj.update();
  binder.size = (sliderValue / 100) * meter;
  binder.update();
  document.getElementById("bboxWidthVal").textContent = sliderValue;
});

// Update height of items
document.getElementById('bboxHeight').addEventListener("input", function() {
  var sliderValue = this.value;
  binder.obj.thick  = (sliderValue / 100) * meter;
  binder.obj.update();
  binder.thick = (sliderValue / 100) * meter;
  binder.update();
  document.getElementById("bboxHeightVal").textContent = sliderValue;
});

// Update Rotation degree of items
document.getElementById('bboxRotation').addEventListener("input", function() {
  var sliderValue = this.value;
  var objTarget = binder.obj;
  objTarget.angle  = sliderValue;
  objTarget.update();
  binder.angle = sliderValue;
  binder.update();
  document.getElementById("bboxRotationVal").textContent = sliderValue;
});

// Door & Window Width changes
document.getElementById('doorWindowWidth').addEventListener("input", function() {
  var sliderValue = this.value;
  var objTarget = binder.obj;
  var wallBind = editor.rayCastingWalls(objTarget, WALLS);
  if (wallBind.length > 1) wallBind = wallBind[wallBind.length-1];
  var limits = limitObj(wallBind.equations.base, sliderValue, objTarget);
  if (qSVG.btwn(limits[1].x, wallBind.start.x, wallBind.end.x) && qSVG.btwn(limits[1].y, wallBind.start.y, wallBind.end.y) && qSVG.btwn(limits[0].x, wallBind.start.x, wallBind.end.x) && qSVG.btwn(limits[0].y, wallBind.start.y, wallBind.end.y)) {
    objTarget.size  = sliderValue;
    objTarget.limit = limits;
    objTarget.update();
    binder.size  = sliderValue;
    binder.limit = limits;
    binder.update();
    document.getElementById("doorWindowWidthVal").textContent = sliderValue;
  }
  inWallRib(wallBind);
});

// Door & Window Height changes
document.getElementById('doorWindowHeight').addEventListener("input", function(){
  var heightValue = this.value
  var objTarget = binder.obj
  objTarget.height = heightValue

  document.getElementById("doorWindowHeightVal").textContent = heightValue
})

// column Height
document.getElementById('bboxColumnHeight').addEventListener("input", function(){
  var colHeight = this.value
  var objTarget = binder.obj
  objTarget.columnHeight = colHeight
  document.getElementById("bboxColumnHeightVal").textContent = colHeight

})

// Door & Window height changes
document.getElementById('doorWindowSillHeight').addEventListener("input", function(){
  var sillHeightValue = this.value
  var objTarget = binder.obj
  objTarget.sillHeight = sillHeightValue

  document.getElementById("doorWindowSillHeightVal").textContent = sillHeightValue
  
})


// Hinge changes
document.getElementById("objToolsHinge").addEventListener("click", function () {
  var objTarget = binder.obj;
  var hingeStatus = objTarget.hinge; // normal or reverse
  if (hingeStatus == 'normal') objTarget.hinge = 'reverse';
  else objTarget.hinge = 'normal';
  objTarget.update();
});

// On Window Load (animate boxes and show history or new modal)
window.addEventListener("load", function(){
  document.getElementById('panel').style.transform = "translateX(200px)";
  document.getElementById('panel').addEventListener("transitionend", function() {
    document.getElementById('moveBox').style.transform = "translateX(-165px)";
    document.getElementById('zoomBox').style.transform = "translateX(-165px)";
  });
  if (!localStorage.getItem('history')) $('#recover').html("<p>Select a plan type.");
  $('#myModal').modal({backdrop: 'static', keyboard: false});
});

// Size of Input text (new text mode)
document.getElementById('sizePolice').addEventListener("input", function() {
  document.getElementById('labelBox').style.fontSize = this.value+'px';
});

// New Text Add Modal
$('#textToLayer').on('hidden.bs.modal', function (e) {
  fonc_button('select_mode');
  action = 0;
  var textToMake = document.getElementById('labelBox').textContent;
  if (textToMake != "" && textToMake.trim() != "") {
    binder = new editor.obj2D("free", "text", document.getElementById('labelBox').style.color, snap, 0, 0, 0, "normal", 0, {text: textToMake, size: document.getElementById('sizePolice').value});
    binder.update();
    OBJDATA.push(binder);
    binder.graph.remove();
    $('#boxText').append(OBJDATA[OBJDATA.length-1].graph);
    OBJDATA[OBJDATA.length-1].update();
    delete binder;
    $('#boxinfo').html('Text added');
    save();
  }
  else {
    $('#boxinfo').html('Select mode');
  }
  document.getElementById('labelBox').textContent = "Your Text";
  document.getElementById('labelBox').style.color = "#333333";
  document.getElementById('labelBox').style.fontSize = "15px";
  document.getElementById('sizePolice').value = 15;
})

// Something...
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return false;
      }
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      while (k < len) {
        if (o[k] === searchElement) {
          return true;
        }
        k++;
      }
      return false;
    }
  });
}

// Is Object equal or ok //
function isObjectsEquals(a, b, message = false) {
  // if (message) console.log(message)
  var isOK = true;
  for (var prop in a) {
    if (a[prop] !== b[prop]) {
      isOK = false;
      break;
    }
  }
  return isOK;
};

// Simple Throttle to callback
function throttle(callback, delay) {
    var last;
    var timer;
    return function () {
        var context = this;
        var now = +new Date();
        var args = arguments;
        if (last && now < last + delay) {
            // the time has not elapsed we reset the timer
            clearTimeout(timer);
            timer = setTimeout(function () {
                last = now;
                callback.apply(context, args);
            }, delay);
        } else {
            last = now;
            callback.apply(context, args);
        }
    };
}

// Zoom Throttle
$("#lin").mousewheel(throttle(function(event) {
    event.preventDefault();
    if (event.deltaY > 0) {
        zoom_maker('zoomin', 200);
    } else {
        zoom_maker('zoomout', 200);
    }
},100));

// ********************* //
// Layers (Show or Hide) //

// Show Rib //
document.getElementById("showRib").addEventListener("click", function () {
  if (document.getElementById("showRib").checked) {
    $('#boxScale').show(200);
    $('#boxRib').show(200);
    showRib = true;
  }
  else {
    $('#boxScale').hide(100);
    $('#boxRib').hide(100);
    showRib = false;
  }
});

// Show Area Box //
document.getElementById("showArea").addEventListener("click", function () {
  if (document.getElementById("showArea").checked) {
    $('#boxArea').show(200);
  }
  else {
    $('#boxArea').hide(100);
  }
});

// Show Room Layer //
document.getElementById("showLayerRoom").addEventListener("click", function () {
  if (document.getElementById("showLayerRoom").checked) {
    $('#boxRoom').show(200);
  }
  else {
    $('#boxRoom').hide(100);
  }
});

// Show Energy or Items //
document.getElementById("showLayerEnergy").addEventListener("click", function () {
  if (document.getElementById("showLayerEnergy").checked) {
    $('#boxEnergy').show(200);
  }
  else {
    $('#boxEnergy').hide(100);
  }
});

// document.getElementById("showLayerFurniture").addEventListener("click", function () {
//   if (document.getElementById("showLayerFurniture").checked) {
//     $('#boxFurniture').show(200);
//   }
//   else {
//     $('#boxFurniture').hide(100);
//   }
// });

// Apply to Superface //
document.getElementById("applySurface").addEventListener("click", function () {
  $('#roomTools').hide(100);
  $('#panel').show(200);
  binder.remove();
  delete binder;
  var id = $('#roomIndex').val();
  //COLOR
  var data = $('#roomBackground').val();
  ROOM[id].color = data;
  //ROOM NAME
  var roomName = $('#roomName').val();
  if (roomName == 'None') roomName = '';
  ROOM[id].name = roomName;
  //ROOM SURFACE
  var area = $('#roomSurface').val();
  ROOM[id].surface = area;
  //SHOW SURFACE
  var show = document.querySelector("#seeArea").checked;
  ROOM[id].showSurface = show;
  //ACTION PARAM
  var action = document.querySelector('input[type=radio]:checked').value;
  ROOM[id].action = action;
  if (action == 'sub') ROOM[id].color = 'hatch';
  if (action != 'sub' && data == 'hatch') ROOM[id].color = 'gradientNeutral';
  $('#boxRoom').empty();
  $('#boxSurface').empty();
  editor.roomMaker(Rooms);
  $('#boxinfo').html('Modified part');
  fonc_button('select_mode');
});

// Reset Room Tools //
document.getElementById("resetRoomTools").addEventListener("click", function () {
  $('#roomTools').hide(100);
  $('#panel').show(200);
  binder.remove();
  delete binder;
  $('#boxinfo').html('Modified part');
  fonc_button('select_mode');
});

// Wall Delete
document.getElementById("wallTrash").addEventListener("click", function () {
  var wall = binder.wall;
  for (var k in WALLS) {
      if (isObjectsEquals(WALLS[k].child, wall)) WALLS[k].child = null;
      if (isObjectsEquals(WALLS[k].parent, wall)) {WALLS[k].parent = null;}
  }
  WALLS.splice(WALLS.indexOf(wall),1);
  $('#wallTools').hide(100);
  wall.graph.remove();
  binder.graph.remove();
  editor.architect(WALLS);
  rib();
  mode = "select_mode";
  $('#panel').show(200);
});

// Assign Wall Type
document.getElementById("typeWall").addEventListener("change", function(){
  var type = this.value
  var wall = binder.wall
  if(wall){
    binder.wall.typeWall = type
  }
})

// Assign Door Window Type
document.getElementById("typeDoorWindow").addEventListener("change", function(){
  var type = this.value
  var doorWindow = binder.obj
  if(doorWindow){
    binder.obj.typeDoorWindow = type
  }
})

// Assign Column Type
document.getElementById("typeColumn").addEventListener("change", function(){
  var type = this.value
  var column = binder.obj
  if(column){
    binder.obj.typeColumn = type
  }
})

// Assign Stair Type
document.getElementById("typeStair").addEventListener("change", function(){
  var type = this.value
  var stair = binder.obj
  if(stair){
    binder.obj.typeStair = type
  }
})

// Text Color Events (change text fill color for new or old text component)
var textEditorColorBtn = document.querySelectorAll('.textEditorColor');
for (var k = 0; k < textEditorColorBtn.length; k++) {
  textEditorColorBtn[k].addEventListener('click', function(){
    document.getElementById('labelBox').style.color = this.style.color;
    if(typeof binder !== 'undefined' && binder && binder.obj && (binder.obj.class == "text" || binder.obj.fill) && binder.obj.value){
      var objTarget = binder.obj;
      if(binder.obj.class == "text"){
        objTarget.type = this.style.color;
      }
      else if(binder.obj.fill){
        objTarget.fill = this.style.color;
      }

      binder.update();
      if(binder.obj.graph.context.children){binder.obj.graph.context.children[0].setAttribute('fill',this.style.color);}
      var info = $('#boxinfo').html();
      $('#boxinfo').html('Color Updated');
      setTimeout(function(){
        $('#boxinfo').html(info);
      }, 1000)
    }
  });
}

// Zoom Button Event
var zoomBtn = document.querySelectorAll('.zoom');
for (var k = 0; k < zoomBtn.length; k++) {
  zoomBtn[k].addEventListener("click", function () {
      lens = this.getAttribute('data-zoom');
      zoom_maker(lens, 200, 50);
  })
}

// Room Color
var roomColorBtn = document.querySelectorAll(".roomColor");
for (var k = 0; k < roomColorBtn.length; k++) {
  roomColorBtn[k].addEventListener("click", function () {
    var data = this.getAttribute('data-type');
    $('#roomBackground').val(data);
    binder.attr({'fill':'url(#'+data+')'});
  });
}

// Object Item (Trash/Remove)
var objTrashBtn = document.querySelectorAll(".objTrash");
for (var k = 0; k < objTrashBtn.length; k++) {
  objTrashBtn[k].addEventListener("click", function () {
    $('#objTools').hide('100');
    var obj = binder.obj;
    obj.graph.remove();
    OBJDATA.splice(OBJDATA.indexOf(obj), 1);
    fonc_button('select_mode');
    $('#boxinfo').html('Select Mode');
    $('#panel').show('200');
    binder.graph.remove();
    delete binder;
    rib();
    $('#panel').show('300');
  });
}

// Dropdown Menu on click
var dropdownMenu = document.querySelectorAll(".dropdown-menu li a");
for (var k = 0; k < dropdownMenu.length; k++) {
  dropdownMenu[k].addEventListener("click", function () {
    var selText = this.textContent;
    $(this).parents('.btn-group').find('.dropdown-toggle').html(selText+' <span class="caret"></span>');
    if (selText != 'None') $('#roomName').val(selText);
    else $('#roomName').val('');
  });
}

// TRY MATRIX CALC FOR BBOX REAL COORDS WITH TRAS + ROT.
function matrixCalc(el, message = false) {
  // if (message) console.log("matrixCalc called by -> "+message);
  var m = el.getCTM();
  var bb = el.getBBox();
  var tpts = [
    matrixXY(m,bb.x,bb.y),
    matrixXY(m,bb.x+bb.width,bb.y),
    matrixXY(m,bb.x+bb.width,bb.y+bb.height),
    matrixXY(m,bb.x,bb.y+bb.height)];
  return tpts;
}
function matrixXY(m,x,y) {
  return { x: x * m.a + y * m.c + m.e, y: x * m.b + y * m.d + m.f };
}
function realBboxShow(coords) {
  for (var k in coords) {
    debugPoint(coords[k]);
  }
}


function limitObj(equation, size, coords,message = false) {
  // if (message) console.log(message)
  var Px = coords.x;
  var Py = coords.y;
  var Aq =  equation.A;
  var Bq =  equation.B;
  if (Aq == 'v') {
    var pos1 = {x: Px, y: Py - size/2};
    var pos2 = {x: Px, y: Py + size/2};
  }
  else if (Aq == 'h') {
    var pos1 = {x: Px - size/2, y: Py};
    var pos2 = {x: Px + size/2, y: Py};
  }
  else {
    var A = 1 + Aq*Aq;
    var B = (-2 * Px) + (2 * Aq * Bq) + (-2 * Py * Aq);
    var C = (Px*Px) + (Bq*Bq) - (2*Py*Bq) + (Py*Py) - (size*size)/4; // -N
    var Delta = (B*B) - (4*A*C);
    var posX1 = (-B-(Math.sqrt(Delta))) / (2*A);
    var posX2 = (-B+(Math.sqrt(Delta))) / (2*A);
    var pos1 = {x: posX1, y: (Aq * posX1) + Bq};
    var pos2 = {x: posX2, y: (Aq * posX2) + Bq};
  }
  return [pos1, pos2];
}

// Zoom-in, out, panning view
function zoom_maker(lens, xmove, xview) {
    if(zoom <= 5 && !xview){
      // Quick Reminder //
      $('#boxinfo').html('Resizing <br/> <small style="font-size:0.7em;color:maroon;">Note: Too much Zoom Out might not have good precison.</small>');
    }else if(!xview){
      $('#boxinfo').html('Resizing');
    }else{
      $('#boxinfo').html('Panning');
    }

    if (lens == 'zoomout' && zoom > 1 && zoom < 15) {
        zoom--;
        width_viewbox += xmove;
        var ratioWidthZoom =  taille_w / width_viewbox;
        height_viewbox = width_viewbox * ratio_viewbox;
        myDiv = document.getElementById("scaleVal");
        myDiv.style.width =  60*ratioWidthZoom+'px';
        originX_viewbox = originX_viewbox - (xmove/2);
        originY_viewbox = originY_viewbox - (xmove/2 * ratio_viewbox);
    }
    if (lens == 'zoomin' && zoom < 14 && zoom > 0) {
        zoom++;
        var oldWidth = width_viewbox;
        width_viewbox -= xmove;
        var ratioWidthZoom = taille_w / width_viewbox;
        height_viewbox = width_viewbox * ratio_viewbox;
        myDiv = document.getElementById("scaleVal");
        myDiv.style.width = 60*ratioWidthZoom+'px';

        originX_viewbox =  originX_viewbox + (xmove/2);
        originY_viewbox =  originY_viewbox + (xmove/2 * ratio_viewbox);
    }
    factor = width_viewbox / taille_w;
    if (lens == 'zoomreset') {
      originX_viewbox = 0;
      originY_viewbox = 0;
      width_viewbox = taille_w;
      height_viewbox = taille_h;
      factor = 1;
    }
    if (lens == 'zoomright') {
        originX_viewbox += xview;
    }
    if (lens == 'zoomleft') {
        originX_viewbox -= xview;
    }
    if (lens == 'zoomtop') {
        originY_viewbox -= xview;
    }
    if (lens == 'zoombottom') {
        originY_viewbox += xview;
    }
    if (lens == 'zoomdrag') {
        originX_viewbox -= xmove;
        originY_viewbox -= xview;
    }
    $('svg').each(function() {
        $(this)[0].setAttribute('viewBox', originX_viewbox + ' ' + originY_viewbox + ' ' + width_viewbox + ' ' + height_viewbox)
    });
}

// Snap items calculate
tactile = false;
function calcul_snap(event, state) {
  if (event.touches) {
    var touches = event.changedTouches;
    eX = touches[0].pageX;
    eY = touches[0].pageY;
    tactile = true;
  }
  else {
    eX = event.pageX;
    eY = event.pageY;
  }
    x_mouse = (eX * factor) - (offset.left * factor) + originX_viewbox;
    y_mouse = (eY * factor) - (offset.top * factor) + originY_viewbox;

    if (state == 'on') {
        x_grid = Math.round(x_mouse / grid) * grid;
        y_grid = Math.round(y_mouse / grid) * grid;
    }
    if (state == 'off') {
        x_grid = x_mouse;
        y_grid = y_mouse;
    }
    return {
        x: x_grid,
        y: y_grid,
        xMouse: x_mouse,
        yMouse: y_mouse
    };
}

// Min Movement check with absolute value
minMoveGrid = function(mouse) {
  return Math.abs(Math.abs(pox - mouse.x) + Math.abs(poy - mouse.y));
}

function intersectionOff() {
  if (typeof(lineIntersectionP) != 'undefined') {
      lineIntersectionP.remove();
      delete lineIntersectionP;
  }
}

// ********************* //
// Intersection validate //
function intersection(snap, range = Infinity, except = ['']) {
  // ORANGE LINES 90° NEAR SEGMENT
  var bestEqPoint = {};
  var equation = {};

  bestEqPoint.distance = range;

  if (typeof(lineIntersectionP) != 'undefined') {
      lineIntersectionP.remove();
      delete lineIntersectionP;
  }

  lineIntersectionP = qSVG.create("boxbind", "path", { // ORANGE TEMP LINE FOR ANGLE 0 90 45 -+
      d: "",
      "stroke": "transparent",
      "stroke-width": 0.5,
      "stroke-opacity": "1",
      fill : "none"
    });

    // console.log(lineIntersectionP)

  for (index = 0; index < WALLS.length; index++) {
    if (except.indexOf(WALLS[index]) == -1) {
    var x1 = WALLS[index].start.x;
    var y1 = WALLS[index].start.y;
    var x2 = WALLS[index].end.x;
    var y2 = WALLS[index].end.y;

    // EQUATION 90° of segment nf/nf-1 at X2/Y2 Point
    if (Math.abs(y2 - y1) == 0) {
      equation.C = 'v'; // C/D equation 90° Coef = -1/E
      equation.D = x1;
      equation.E = 'h'; // E/F equation Segment
      equation.F = y1;
      equation.G = 'v'; // G/H equation 90° Coef = -1/E
      equation.H = x2;
      equation.I = 'h'; // I/J equation Segment
      equation.J = y2;
    }
    else if (Math.abs(x2 - x1) == 0) {
      equation.C = 'h'; // C/D equation 90° Coef = -1/E
      equation.D = y1;
      equation.E = 'v'; // E/F equation Segment
      equation.F = x1;
      equation.G = 'h'; // G/H equation 90° Coef = -1/E
      equation.H = y2;
      equation.I = 'v'; // I/J equation Segment
      equation.J = x2;
    }
    else {
      equation.C = (x1 - x2) / (y2 - y1);
      equation.D = y1 - (x1 * equation.C);
      equation.E = (y2 - y1) / (x2 - x1);
      equation.F = y1 - (x1 * equation.E);
      equation.G = (x1 - x2) / (y2 - y1);
      equation.H = y2 - (x2 * equation.C);
      equation.I = (y2 - y1) / (x2 - x1);
      equation.J = y2 - (x2 * equation.E);
      }
      equation.A = equation.C;
      equation.B = equation.D;
      eq = qSVG.nearPointOnEquation(equation, snap);
      if (eq.distance < bestEqPoint.distance) {
          bestEqPoint.distance = eq.distance;
          bestEqPoint.node = index;
          bestEqPoint.x = eq.x;
          bestEqPoint.y = eq.y;
          bestEqPoint.x1 = x1;
          bestEqPoint.y1 = y1;
          bestEqPoint.x2 = x2;
          bestEqPoint.y2 = y2;
          bestEqPoint.way = 1;
      }
      equation.A = equation.E;
      equation.B = equation.F;
      eq = qSVG.nearPointOnEquation(equation, snap);
      if (eq.distance < bestEqPoint.distance) {
          bestEqPoint.distance = eq.distance;
          bestEqPoint.node = index;
          bestEqPoint.x = eq.x;
          bestEqPoint.y = eq.y;
          bestEqPoint.x1 = x1;
          bestEqPoint.y1 = y1;
          bestEqPoint.x2 = x2;
          bestEqPoint.y2 = y2;
          bestEqPoint.way = 1;
      }
      equation.A = equation.G;
      equation.B = equation.H;
      eq = qSVG.nearPointOnEquation(equation, snap);
      if (eq.distance < bestEqPoint.distance) {
          bestEqPoint.distance = eq.distance;
          bestEqPoint.node = index;
          bestEqPoint.x = eq.x;
          bestEqPoint.y = eq.y;
          bestEqPoint.x1 = x1;
          bestEqPoint.y1 = y1;
          bestEqPoint.x2 = x2;
          bestEqPoint.y2 = y2;
          bestEqPoint.way = 2;
      }
      equation.A = equation.I;
      equation.B = equation.J;
      eq = qSVG.nearPointOnEquation(equation, snap);
      if (eq.distance < bestEqPoint.distance) {
          bestEqPoint.distance = eq.distance;
          bestEqPoint.node = index;
          bestEqPoint.x = eq.x;
          bestEqPoint.y = eq.y;
          bestEqPoint.x1 = x1;
          bestEqPoint.y1 = y1;
          bestEqPoint.x2 = x2;
          bestEqPoint.y2 = y2;
          bestEqPoint.way = 2;
      }
   } // END INDEXOF EXCEPT TEST
  } // END LOOP FOR

  if (bestEqPoint.distance < range) {
    if (bestEqPoint.way == 2) {
      lineIntersectionP.attr({ // ORANGE TEMP LINE FOR ANGLE 0 90 45 -+
          d: "M"+bestEqPoint.x1+","+bestEqPoint.y1+" L"+bestEqPoint.x2+","+bestEqPoint.y2+" L"+bestEqPoint.x+","+bestEqPoint.y,
          "stroke": "#d7ac57"
        });
    }
    else {
      lineIntersectionP.attr({ // ORANGE TEMP LINE FOR ANGLE 0 90 45 -+
          d: "M"+bestEqPoint.x2+","+bestEqPoint.y2+" L"+bestEqPoint.x1+","+bestEqPoint.y1+" L"+bestEqPoint.x+","+bestEqPoint.y,
          "stroke": "#d7ac57"
        });
    }
    return ({
    x: bestEqPoint.x,
    y: bestEqPoint.y,
    wall : WALLS[bestEqPoint.node],
    distance: bestEqPoint.distance
    });
  }
  else {
    return false;
  }
}

function debugPoint(point, name, color = "#00ff00") {
      qSVG.create('boxDebug', 'circle', {
      cx: point.x,
      cy: point.y,
      r: 7,
      fill: color,
      id: name,
      class: "visu"
  });
}

function showVertex() {
  for (var i=0; i < vertex.length; i++) {
    debugPoint(vertex[i], i);
    
  }
}

function showJunction() {
  for (var i=0; i < junction.length; i++) {
    debugPoint({x: junction[i].values[0], y: junction[i].values[1]}, i);
  }
}

$('.visu').mouseover(function() {console.log(this.id)});

var sizeText = [];
var showAllSizeStatus = 0;
function hideAllSize() {
  $('#boxbind').empty();
  sizeText = [];
  showAllSizeStatus = 0;
}

function allRib() {
  $('#boxRib').empty();
  for (var i in WALLS) {
    inWallRib(WALLS[i], 'all');
  }
}

// In Wall Rib Generate (window, door etc.)
function inWallRib(wall, option = false) {
  if (!option) $('#boxRib').empty();
  ribMaster = [];
  ribMaster.push([]);
  ribMaster.push([]);
  var inter;
  var distance;
  var cross;
  var angleTextValue = wall.angle*(180/Math.PI);
  var objWall = editor.objFromWall(wall); // LIST OBJ ON EDGE
  ribMaster[0].push({wall: wall, crossObj: false, side : 'up', coords: wall.coords[0], distance: 0});
  ribMaster[1].push({wall: wall, crossObj: false, side : 'down', coords: wall.coords[1], distance: 0});
  for (var ob in objWall) {
    var objTarget = objWall[ob];
    objTarget.up = [
      qSVG.nearPointOnEquation(wall.equations.up, objTarget.limit[0]),
      qSVG.nearPointOnEquation(wall.equations.up, objTarget.limit[1])
    ];
    objTarget.down = [
      qSVG.nearPointOnEquation(wall.equations.down, objTarget.limit[0]),
      qSVG.nearPointOnEquation(wall.equations.down, objTarget.limit[1])
    ];

    distance = qSVG.measure(wall.coords[0], objTarget.up[0]) / meter;
    ribMaster[0].push({wall: objTarget, crossObj: ob, side : 'up', coords: objTarget.up[0], distance: distance.toFixed(2)});
    distance = qSVG.measure(wall.coords[0], objTarget.up[1]) / meter;
    ribMaster[0].push({wall: objTarget, crossObj: ob, side : 'up', coords: objTarget.up[1], distance: distance.toFixed(2)});
    distance = qSVG.measure(wall.coords[1], objTarget.down[0]) / meter;
    ribMaster[1].push({wall: objTarget, crossObj: ob, side : 'down', coords: objTarget.down[0], distance: distance.toFixed(2)});
    distance = qSVG.measure(wall.coords[1], objTarget.down[1]) / meter;
    ribMaster[1].push({wall: objTarget, crossObj: ob, side : 'down', coords: objTarget.down[1], distance: distance.toFixed(2)});
  }
  distance = qSVG.measure(wall.coords[0], wall.coords[3]) / meter;
  ribMaster[0].push({wall: objTarget, crossObj: false, side : 'up', coords: wall.coords[3], distance: distance});
  distance = qSVG.measure(wall.coords[1], wall.coords[2]) / meter;
  ribMaster[1].push({wall: objTarget, crossObj: false, side : 'down', coords: wall.coords[2], distance: distance});
    ribMaster[0].sort(function(a,b) {
      return (a.distance - b.distance).toFixed(2);
    });
    ribMaster[1].sort(function(a,b) {
      return (a.distance - b.distance).toFixed(2);
    });
  for (var t in ribMaster) {
    for (var n = 1; n < ribMaster[t].length; n++) {
      var found = true;
      var shift = -5;
      var valueText = Math.abs(ribMaster[t][n-1].distance - ribMaster[t][n].distance);
      var angleText = angleTextValue;
      if (found) {
          if (ribMaster[t][n-1].side == 'down') {shift = -shift+10;}
          if (angleText > 89 || angleText < -89) {
            angleText-=180;
            if (ribMaster[t][n-1].side == 'down') {shift = -5;}
            else shift = -shift+10;
          }

          sizeText[n] = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          var startText = qSVG.middle(ribMaster[t][n-1].coords.x, ribMaster[t][n-1].coords.y, ribMaster[t][n].coords.x, ribMaster[t][n].coords.y);
          sizeText[n].setAttributeNS(null, 'x', startText.x);
          sizeText[n].setAttributeNS(null, 'y', (startText.y)+shift);
          sizeText[n].setAttributeNS(null, 'text-anchor', 'middle');
          sizeText[n].setAttributeNS(null, 'font-family', 'roboto');
          sizeText[n].setAttributeNS(null, 'stroke', '#ffffff');
          sizeText[n].textContent = valueText.toFixed(2);
          if (sizeText[n].textContent < 1) {
            sizeText[n].setAttributeNS(null, 'font-size', '0.8em');
            sizeText[n].textContent = sizeText[n].textContent.substring(1, sizeText[n].textContent.length);
          }
          else sizeText[n].setAttributeNS(null, 'font-size', '1em');
          sizeText[n].setAttributeNS(null, 'stroke-width', '0.27px');
          sizeText[n].setAttributeNS(null, 'fill', '#666666');
          sizeText[n].setAttribute("transform", "rotate("+angleText+" "+startText.x+","+(startText.y)+")");

          $('#boxRib').append(sizeText[n]);
      }
    }
  }
}

// Simple other elements Rib (not in wall)
function rib(shift = 5) {

  // return false;
  var ribMaster = [];
  ribMaster.push([]);
  ribMaster.push([]);
  var inter;
  var distance;
  var cross;
  for (var i in WALLS) {
    if(WALLS[i].roof == true || WALLS[i].slab == true){
      continue;
    }
    if (WALLS[i].equations.base) {
      ribMaster[0].push([]);
      ribMaster[0][i].push({wallIndex: i, crossEdge: i, side : 'up', coords: WALLS[i].coords[0], distance: 0});
      ribMaster[1].push([]);
      ribMaster[1][i].push({wallIndex: i, crossEdge: i, side : 'down', coords: WALLS[i].coords[1], distance: 0});
      for (var p in WALLS) {
        if (i != p && WALLS[p].equations.base) {
          cross = qSVG.intersectionOfEquations(WALLS[i].equations.base, WALLS[p].equations.base, "object");
          if (qSVG.btwn(cross.x, WALLS[i].start.x, WALLS[i].end.x, 'round') && qSVG.btwn(cross.y, WALLS[i].start.y, WALLS[i].end.y, 'round')) {

            inter = qSVG.intersectionOfEquations(WALLS[i].equations.up, WALLS[p].equations.up, "object");
            if (qSVG.btwn(inter.x, WALLS[i].coords[0].x, WALLS[i].coords[3].x, 'round') && qSVG.btwn(inter.y, WALLS[i].coords[0].y, WALLS[i].coords[3].y, 'round') && qSVG.btwn(inter.x, WALLS[p].coords[0].x, WALLS[p].coords[3].x, 'round') && qSVG.btwn(inter.y, WALLS[p].coords[0].y, WALLS[p].coords[3].y, 'round')){
              distance = qSVG.measure(WALLS[i].coords[0], inter) / meter;
              ribMaster[0][i].push({wallIndex: i, crossEdge: p, side : 'up', coords: inter, distance: distance.toFixed(2)});
            }

            inter = qSVG.intersectionOfEquations(WALLS[i].equations.up, WALLS[p].equations.down, "object");
            if (qSVG.btwn(inter.x, WALLS[i].coords[0].x, WALLS[i].coords[3].x, 'round') && qSVG.btwn(inter.y, WALLS[i].coords[0].y, WALLS[i].coords[3].y, 'round') && qSVG.btwn(inter.x, WALLS[p].coords[1].x, WALLS[p].coords[2].x, 'round') && qSVG.btwn(inter.y, WALLS[p].coords[1].y, WALLS[p].coords[2].y, 'round')){
              distance = qSVG.measure(WALLS[i].coords[0], inter) / meter;
              ribMaster[0][i].push({wallIndex: i, crossEdge: p, side : 'up', coords: inter, distance: distance.toFixed(2)});
            }

            inter = qSVG.intersectionOfEquations(WALLS[i].equations.down, WALLS[p].equations.up, "object");
            if (qSVG.btwn(inter.x, WALLS[i].coords[1].x, WALLS[i].coords[2].x, 'round') && qSVG.btwn(inter.y, WALLS[i].coords[1].y, WALLS[i].coords[2].y, 'round') && qSVG.btwn(inter.x, WALLS[p].coords[0].x, WALLS[p].coords[3].x, 'round') && qSVG.btwn(inter.y, WALLS[p].coords[0].y, WALLS[p].coords[3].y, 'round')){
              distance = qSVG.measure(WALLS[i].coords[1], inter) / meter;
              ribMaster[1][i].push({wallIndex: i, crossEdge: p, side : 'down', coords: inter, distance: distance.toFixed(2)});
            }

            inter = qSVG.intersectionOfEquations(WALLS[i].equations.down, WALLS[p].equations.down, "object");
            if (qSVG.btwn(inter.x, WALLS[i].coords[1].x, WALLS[i].coords[2].x, 'round') && qSVG.btwn(inter.y, WALLS[i].coords[1].y, WALLS[i].coords[2].y, 'round') && qSVG.btwn(inter.x, WALLS[p].coords[1].x, WALLS[p].coords[2].x, 'round') && qSVG.btwn(inter.y, WALLS[p].coords[1].y, WALLS[p].coords[2].y, 'round')){
              distance = qSVG.measure(WALLS[i].coords[1], inter) / meter;
              ribMaster[1][i].push({wallIndex: i, crossEdge: p, side : 'down', coords: inter, distance: distance.toFixed(2)});
            }
          }
        }
      }
      distance = qSVG.measure(WALLS[i].coords[0], WALLS[i].coords[3]) / meter;
      ribMaster[0][i].push({wallIndex: i, crossEdge: i, side : 'up', coords: WALLS[i].coords[3], distance: distance.toFixed(2)});
      distance = qSVG.measure(WALLS[i].coords[1], WALLS[i].coords[2]) / meter;
      ribMaster[1][i].push({wallIndex: i, crossEdge: i, side : 'down', coords: WALLS[i].coords[2], distance: distance.toFixed(2)});
    }
  }

  for (var a in ribMaster[0]) {
    ribMaster[0][a].sort(function(a,b) {
      return (a.distance - b.distance).toFixed(2);
    });
  }
  for (var a in ribMaster[1]) {
    ribMaster[1][a].sort(function(a,b) {
      return (a.distance - b.distance).toFixed(2);
    });
  }

  var sizeText = [];
  if (shift == 5) $('#boxRib').empty();
  for (var t in ribMaster) {
    for (var a in ribMaster[t]) {
      for (var n = 1; n < ribMaster[t][a].length; n++) {
        if (ribMaster[t][a][n-1].wallIndex == ribMaster[t][a][n].wallIndex) {
          var edge = ribMaster[t][a][n].wallIndex;
          var found = true;
          var valueText = Math.abs(ribMaster[t][a][n-1].distance - ribMaster[t][a][n].distance);
          // CLEAR TOO LITTLE VALUE
          if (valueText < 0.15) {
            found = false;
          }
          // CLEAR (thick) BETWEEN CROSS EDGE
          if (found && ribMaster[t][a][n-1].crossEdge == ribMaster[t][a][n].crossEdge &&  ribMaster[t][a][n].crossEdge != ribMaster[t][a][n].wallIndex){
            found= false;
          }
          // CLEAR START INTO EDGE
          if (found && ribMaster[t][a].length > 2 && n==1) {
            var polygon = [];
            for (var pp = 0; pp < 4; pp++) {
              polygon.push({x: WALLS[ribMaster[t][a][n].crossEdge].coords[pp].x, y: WALLS[ribMaster[t][a][n].crossEdge].coords[pp].y}); // FOR Z
            }
            if (qSVG.rayCasting(ribMaster[t][a][0].coords, polygon)) {
              found = false;
            }
          }
          // CLEAR END INTO EDGE
          if (found && ribMaster[t][a].length > 2 && n == ribMaster[t][a].length-1){
            var polygon = [];
            for (var pp = 0; pp < 4; pp++) {
              polygon.push({x: WALLS[ribMaster[t][a][n-1].crossEdge].coords[pp].x, y: WALLS[ribMaster[t][a][n-1].crossEdge].coords[pp].y}); // FOR Z
            }
            if (qSVG.rayCasting(ribMaster[t][a][ribMaster[t][a].length-1].coords, polygon)) {
              found = false;
            }
          }

          if (found) {
              var angleText = WALLS[ribMaster[t][a][n].wallIndex].angle*(180/Math.PI);
              var shiftValue = -shift;
              if (ribMaster[t][a][n-1].side == 'down') {shiftValue = -shiftValue+10;}
              if (angleText > 90 || angleText < -89) {
                angleText-=180;
                if (ribMaster[t][a][n-1].side == 'down') {shiftValue = -shift;}
                else shiftValue = -shiftValue+10;
              }
              sizeText[n] = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              var startText = qSVG.middle(ribMaster[t][a][n-1].coords.x, ribMaster[t][a][n-1].coords.y, ribMaster[t][a][n].coords.x, ribMaster[t][a][n].coords.y);
              sizeText[n].setAttributeNS(null, 'x', startText.x);
              sizeText[n].setAttributeNS(null, 'y', (startText.y)+(shiftValue));
              sizeText[n].setAttributeNS(null, 'text-anchor', 'middle');
              sizeText[n].setAttributeNS(null, 'font-family', 'roboto');
              sizeText[n].setAttributeNS(null, 'stroke', '#ffffff');
              sizeText[n].textContent = valueText.toFixed(2);
              if (sizeText[n].textContent < 1) {
                sizeText[n].setAttributeNS(null, 'font-size', '0.73em');
                sizeText[n].textContent = sizeText[n].textContent.substring(1, sizeText[n].textContent.length);
              }
              else sizeText[n].setAttributeNS(null, 'font-size', '0.9em');
              sizeText[n].setAttributeNS(null, 'stroke-width', '0.2px');
              sizeText[n].setAttributeNS(null, 'fill', '#555555');
              sizeText[n].setAttribute("transform", "rotate("+angleText+" "+startText.x+","+(startText.y)+")");

              $('#boxRib').append(sizeText[n]);
          }
        }
      }
    }
  }
}

// Cursor Image
function cursor(tool) {
  if (tool == 'grab') tool = "url('./icons/grab.png') 8 8, auto";
  if (tool == 'scissor') tool = "url('./icons/scissor.png'), auto";
  if (tool == 'trash') tool = "url('./icons/trash.png'), auto";
  if (tool == 'validation') tool = "url('./icons/check.png'), auto";
  $('#lin').css('cursor',tool);
}

function fullscreen() {
    // go full-screen
    var i = document.body;
  if (i.requestFullscreen) {
  	i.requestFullscreen();
  } else if (i.webkitRequestFullscreen) {
  	i.webkitRequestFullscreen();
  } else if (i.mozRequestFullScreen) {
  	i.mozRequestFullScreen();
  } else if (i.msRequestFullscreen) {
  	i.msRequestFullscreen();
  }
}

function outFullscreen() {
  if(document.exitFullscreen) {
    document.exitFullscreen();
  } else if(document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if(document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

document.addEventListener("fullscreenchange", function() {
  if (
	!document.fullscreenElement &&
	!document.webkitFullscreenElement &&
	!document.mozFullScreenElement &&
	!document.msFullscreenElement) {
  $('#nofull_mode').display='none';$('#full_mode').show();
  }
});

function raz_button() {
    $('#rect_mode').removeClass('btn-success');
    $('#rect_mode').addClass('btn-default');
    $('#select_mode').removeClass('btn-success');
    $('#select_mode').addClass('btn-default');
    $('#line_mode').removeClass('btn-success');
    $('#line_mode').addClass('btn-default');
    $('#partition_mode').removeClass('btn-success');
    $('#partition_mode').addClass('btn-default');
    $('#door_mode').removeClass('btn-success');
    $('#door_mode').addClass('btn-default');
    $('#node_mode').removeClass('btn-success');
    $('#node_mode').addClass('btn-default');
    $('#text_mode').removeClass('btn-success');
    $('#text_mode').addClass('btn-default');
    $('#room_mode').removeClass('btn-success');
    $('#room_mode').addClass('btn-default');
    $('#distance_mode').removeClass('btn-success');
    $('#distance_mode').addClass('btn-default');
    $('#object_mode').removeClass('btn-success');
    $('#object_mode').addClass('btn-default');
    $('#beam').removeClass('btn-success');
    $('#beam').addClass('btn-default');
    $('#column').removeClass('btn-success');
    $('#column').addClass('btn-default');
    $('#slab').removeClass('btn-success');
    $('#slab').addClass('btn-default');
    $('#roof').removeClass('btn-success');
    $('#roof').addClass('btn-default');
    $('#stair_mode').removeClass('btn-success');
    $('#stair_mode').addClass('btn-default');
}

function fonc_button(modesetting ,option, id) {
  save();

  $('.sub').hide();
    raz_button();
    if (option != 'simpleStair') {
      $('#' + (id?id:modesetting)).removeClass('btn-default');
      $('#' + (id?id:modesetting)).addClass('btn-success');

    }
    mode = modesetting;
    modeOption = option;

    if (typeof(lineIntersectionP) != 'undefined') {
        lineIntersectionP.remove();
        delete lineIntersectionP;
    }
}


$('#distance_mode').click(function() {
  $('#lin').css('cursor', 'crosshair');
  $('#boxinfo').html('Add a measurement');
  fonc_button('distance_mode');
});

$('#room_mode').click(function() {
    $('#lin').css('cursor', 'pointer');
    $('#boxinfo').html('Config. of rooms');
    fonc_button('room_mode');
});

$('#select_mode').click(function() {
  $('#boxinfo').html('Select Mode');
  if (typeof(binder) != 'undefined') {
      if(typeof binder.remove === "function"){
        binder.remove();
        delete binder;
      }
  }

  fonc_button('select_mode');
});

$('#line_mode').click(function() {
    $('#lin').css('cursor', 'crosshair');
    $('#boxinfo').html('Wall(s) creation');
    multi = 0;
    action = 0;
    // snap = calcul_snap(event, grid_snap);
    //
    // pox = snap.x;
    // poy = snap.y;
    fonc_button('line_mode');
});



$('#partition_mode').click(function() {
    $('#lin').css('cursor', 'crosshair');
    $('#boxinfo').html('Creation of partition(s)');
    multi = 0;
    fonc_button('partition_mode');
});

$('#rect_mode').click(function() {
    $('#lin').css('cursor', 'crosshair');
    $('#boxinfo').html('Creation of room(s)');
    fonc_button('rect_mode');
});

$('.door').click(function() {
    $('#lin').css('cursor', 'crosshair');
    $('#boxinfo').html('Add a door');
    $('#door_list').hide(200);
    fonc_button('door_mode', this.id);
});

$('.window').click(function() {
    $('#lin').css('cursor', 'crosshair');
    $('#boxinfo').html('Add a window');
    $('#door_list').hide(200);
    $('#window_list').hide(200);
    fonc_button('door_mode', this.id);
});

$('.object').click(function() {
    cursor('move');
    $('#boxinfo').html('Add an object');
    fonc_button('object_mode', this.id);
});

$('.beam').click(function(){
    cursor('move');
    // multi = 0
    $('#boxinfo').html('Add a beam');
    fonc_button('object_mode', this.id, this.id);
})

$('.column').click(function(){
  $('#lin').css('cursor', 'crosshair');
  // multi = 0
  $('#boxinfo').html('Add a column');
  fonc_button('object_mode', this.id, this.id)
})

$('#slab').click(function(){
  $('#boxinfo').html('Slab Added');
  fonc_button('object_mode', this.id, this.id)
})

$('#roof').click(function(){
  $('#boxinfo').html('Roof Added');
  fonc_button('object_mode', this.id, this.id)
})

$('#stair_mode').click(function() {
    cursor('move');
    $('#boxinfo').html('Add a staircase');
    fonc_button('object_mode', 'simpleStair');
});

$('#node_mode').click(function() {
    $('#boxinfo').html('Cutting a wall <br/> <span style = \"font-size: 0.7em \"> Caution: Cutting the wall of a room can cancel its configuration</span>');
    fonc_button('node_mode');
});

$('#text_mode').click(function() {
    $('#boxinfo').html('Add text <br/> <span style = \"font-size: 0.7em \"> Move the cursor to the desired location, then type your text. </span>');
    fonc_button('text_mode');
});

$('#grid_mode').click(function() {
    if (grid_snap == 'on') {
        grid_snap = 'off';
        $('#boxinfo').html('Grid off');
        $('#grid_mode').removeClass('btn-success');
        $('#grid_mode').addClass('btn-warning');
        $('#grid_mode').html('GRID OFF');
        $('#boxgrid').css('opacity', '0.5');
    } else {
        grid_snap = 'on';
        $('#boxinfo').html('Grid on');
        $('#grid_mode').removeClass('btn-warning');
        $('#grid_mode').addClass('btn-success');
        $('#grid_mode').html('GRID ON <i class="fa fa-th" aria-hidden="true"></i>');
        $('#boxgrid').css('opacity', '1');
    }
});

//  RETURN PATH(s) ARRAY FOR OBJECT + PROPERTY params => bindBox (false = open sideTool), move, resize, rotate
function carpentryCalc(classObj, typeObj, sizeObj, thickObj, dividerObj = 10, fill) {
  var construc = [];
  construc.params = {};
  construc.params.bindBox = false;
  construc.params.move = false;
  construc.params.resize = false;
  construc.params.resizeLimit = {};
  construc.params.resizeLimit.width = {min: false, max: false};
  construc.params.resizeLimit.height = {min: false, max: false};
  construc.params.resizeLimit.columnHeight = {min: false, max: false};
  construc.params.rotate = false;
  construc.params.columnHeight = false;
  construc.params.typeColumn = false;
  construc.params.demolish = false;

  if (classObj == 'socle') {
    construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" L "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2)+" Z", 'fill': "#5cba79", 'stroke': "#5cba79", 'strokeDashArray': ''});
  }
  if (classObj == 'doorWindow') {
    if (typeObj == 'simple') {
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" L "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2)+" Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.push({'path': "M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+(-sizeObj-thickObj/2)+"  A"+sizeObj+","+sizeObj+" 0 0,1 "+sizeObj/2+","+(-thickObj/2), 'fill': "none", 'stroke': colorWall, 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:40, max:120};
    }
    if (typeObj == 'double') {
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" L "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2)+" Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.push({'path': "M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+(-sizeObj/2-thickObj/2)+"  A"+sizeObj/2+","+sizeObj/2+" 0 0,1 0,"+(-thickObj/2), 'fill': "none", 'stroke': colorWall, 'strokeDashArray': ''});
      construc.push({'path': "M "+(sizeObj/2)+","+(-thickObj/2)+" L "+(sizeObj/2)+","+(-sizeObj/2-thickObj/2)+"  A"+sizeObj/2+","+sizeObj/2+" 0 0,0 0,"+(-thickObj/2), 'fill': "none", 'stroke': colorWall, 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:40, max:160};
    }
    if (typeObj == 'pocket') {
      construc.push({'path':"M "+(-sizeObj/2)+","+(-(thickObj/2)-4)+" L "+(-sizeObj/2)+","+thickObj/2+" L "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-(thickObj/2)-4)+" Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': 'none'});
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" M "+(sizeObj/2)+","+(thickObj/2)+" L "+(sizeObj/2)+","+(-thickObj/2), 'fill': "none", 'stroke': "#494646", 'strokeDashArray': '5 5'});
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+(-thickObj/2-5)+" L "+(+sizeObj/2)+","+(-thickObj/2-5)+" L "+(+sizeObj/2)+","+(-thickObj/2)+" Z", 'fill': "url(#hatch)", 'stroke': "#494646", 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:60, max:200};
    }
    if (typeObj == 'aperture') {
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" L "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2)+" Z", 'fill': "#ccc", 'stroke': "#494646", 'strokeDashArray': '5,5'});
      construc.push({'path':"M "+(-sizeObj/2)+","+(-(thickObj/2))+" L "+(-sizeObj/2)+","+thickObj/2+" L "+((-sizeObj/2)+5)+","+thickObj/2+" L "+((-sizeObj/2)+5)+","+(-(thickObj/2))+" Z", 'fill': "none", 'stroke': "#494646", 'strokeDashArray': 'none'});
      construc.push({'path':"M "+((sizeObj/2)-5)+","+(-(thickObj/2))+" L "+((sizeObj/2)-5)+","+thickObj/2+" L "+(sizeObj/2)+","+thickObj/2+" L "+(sizeObj/2)+","+(-(thickObj/2))+" Z", 'fill': "none", 'stroke': "#494646", 'strokeDashArray': 'none'});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:40, max:500};
    }
    if (typeObj == 'fix') {
      construc.push({'path':"M "+(-sizeObj/2)+",-2 L "+(-sizeObj/2)+",2 L "+sizeObj/2+",2 L "+sizeObj/2+",-2 Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" M "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2), 'fill': "none", 'stroke': "#ccc", 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:30, max:300};
    }
    if (typeObj == 'flap') {
      construc.push({'path':"M "+(-sizeObj/2)+",-2 L "+(-sizeObj/2)+",2 L "+sizeObj/2+",2 L "+sizeObj/2+",-2 Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" M "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2), 'fill': "none", 'stroke': "#ccc", 'strokeDashArray': ''});
      construc.push({'path': "M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+((-sizeObj/2)+((sizeObj)*0.866))+","+((-sizeObj/2)-(thickObj/2))+"  A"+sizeObj+","+sizeObj+" 0 0,1 "+sizeObj/2+","+(-thickObj/2), 'fill': "none", 'stroke': colorWall, 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:20, max:100};
    }
    if (typeObj == 'twin') {
      construc.push({'path':"M "+(-sizeObj/2)+",-2 L "+(-sizeObj/2)+",2 L "+sizeObj/2+",2 L "+sizeObj/2+",-2 Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" M "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2), 'fill': "none", 'stroke': "#ccc", 'strokeDashArray': ''});
      construc.push({'path': "M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+((-sizeObj/2)+((sizeObj/2)*0.866))+","+(-sizeObj/4-thickObj/2)+"  A"+sizeObj/2+","+sizeObj/2+" 0 0,1 0,"+(-thickObj/2), 'fill': "none", 'stroke': colorWall, 'strokeDashArray': ''});
      construc.push({'path': "M "+(sizeObj/2)+","+(-thickObj/2)+" L "+((sizeObj/2)+((-sizeObj/2)*0.866))+","+(-sizeObj/4-thickObj/2)+"  A"+sizeObj/2+","+sizeObj/2+" 0 0,0 0,"+(-thickObj/2), 'fill': "none", 'stroke': colorWall, 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:40, max:200};
    }
    if (typeObj == 'bay') {
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" M "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2), 'fill': "none", 'stroke': "#ccc", 'strokeDashArray': ''});
      construc.push({'path':"M "+(-sizeObj/2)+",-2 L "+(-sizeObj/2)+",0 L 2,0 L 2,2 L 3,2 L 3,-2 Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.push({'path':"M -2,1 L -2,3 L "+sizeObj/2+",3 L "+sizeObj/2+",1 L -1,1 L -1,-1 L -2,-1 Z", 'fill': "#ccc", 'stroke': "none", 'strokeDashArray': ''});
      construc.params.resize = true;
      construc.params.resizeLimit.width = {min:60, max:300};
    }
  }

  if (classObj == 'measure') {
    construc.params.bindBox = true;
    // console.log(sizeObj)
    construc.push({'path':"M-"+(sizeObj/2)+",0 l10,-10 l0,8 l"+(sizeObj-20)+",0 l0,-8 l10,10 l-10,10 l0,-8 l-"+(sizeObj-20)+",0 l0,8 Z", 'fill': "#729eeb", 'stroke': "none", 'strokeDashArray': ''});
    }

  if (classObj == 'boundingBox') {
    construc.push({'path':"M"+(-sizeObj/2-10)+","+(-thickObj/2-10)+" L"+(sizeObj/2+10)+","+(-thickObj/2-10)+" L"+(sizeObj/2+10)+","+(thickObj/2+10)+" L"+(-sizeObj/2-10)+","+(thickObj/2+10)+" Z", 'fill':'none', 'stroke':"#aaa", 'strokeDashArray': ''});

    // construc.push({'path':"M"+dividerObj[0].x+","+dividerObj[0].y+" L"+dividerObj[1].x+","+dividerObj[1].y+" L"+dividerObj[2].x+","+dividerObj[2].y+" L"+dividerObj[3].x+","+dividerObj[3].y+" Z", 'fill':'none', 'stroke':"#000", 'strokeDashArray': ''});
  }

  //typeObj = color  dividerObj = text
  if (classObj == 'text') {
    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.rotate = true;
    construc.push({'text': dividerObj.text, 'x': '0', 'y':'0', 'fill': typeObj, 'stroke': typeObj, 'fontSize': dividerObj.size+'px',"strokeWidth": "0px"});
  }

  if (classObj == 'stair') {
    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.resize = true;
    construc.params.rotate = true;
    construc.params.width = sizeObj?sizeObj:100; // Resize width/height to obj size/thick
    construc.params.height = thickObj?thickObj:300;
    if (typeObj == 'simpleStair') {
      construc.push({'path':"M "+(-sizeObj/2)+","+(-thickObj/2)+" L "+(-sizeObj/2)+","+thickObj/2+" L "+sizeObj/2+","+thickObj/2+" L "+sizeObj/2+","+(-thickObj/2)+" Z", 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});

      var heightStep = thickObj / (dividerObj);
      for (var i =1; i < dividerObj+1; i++) {
        construc.push({'path':"M "+(-sizeObj/2)+","+((-thickObj/2)+(i*heightStep))+" L "+(sizeObj/2)+","+((-thickObj/2)+(i*heightStep)), 'fill': "none", 'stroke': "#000", 'strokeDashArray': 'none'});
      }
      construc.params.resizeLimit.width = {min:40, max:200};
      construc.params.resizeLimit.height = {min:40, max:400};
    }

  }

  if (classObj == 'energy') {
    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.resize = false;
    construc.params.rotate = false;
    if (typeObj == 'gtl') {
      construc.push({'path': "m -20,-20 l 40,0 l0,40 l-40,0 Z", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "GTL", 'x': '0', 'y':'5', 'fill': "#333333", 'stroke': "none", 'fontSize': '0.9em',"strokeWidth": "0.4px"});
      construc.params.width = 40;
      construc.params.height = 40;
      construc.family = 'stick';
    }
    if (typeObj == 'switch') {
      construc.push({'path': qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': qSVG.circlePath(-2, 4, 5), 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,0 5,-9", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';

    }
    if (typeObj == 'doubleSwitch') {
      construc.push({'path': qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': qSVG.circlePath(0,0, 4), 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 2,-3 5,-8 3,2", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m -2,3 -5,8 -3,-2", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'dimmer') {
      construc.push({'path': qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': qSVG.circlePath(-2, 4, 5), 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,0 5,-9", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M -2,-6 L 10,-4 L-2,-2 Z", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'plug') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "M 10,-6 a 10,10 0 0 1 -5,8 10,10 0 0 1 -10,0 10,10 0 0 1 -5,-8", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,3 v 7", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m -10,4 h 20", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'plug20') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "M 10,-6 a 10,10 0 0 1 -5,8 10,10 0 0 1 -10,0 10,10 0 0 1 -5,-8", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,3 v 7", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m -10,4 h 20", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "20A", 'x': '0', 'y':'-5', 'fill': "#333333", 'stroke': "none", 'fontSize': '0.65em',"strokeWidth": "0.4px"});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'plug32') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "M 10,-6 a 10,10 0 0 1 -5,8 10,10 0 0 1 -10,0 10,10 0 0 1 -5,-8", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,3 v 7", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m -10,4 h 20", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "32A", 'x': '0', 'y':'-5', 'fill': "#333333", 'stroke': "none", 'fontSize': '0.65em',"strokeWidth": "0.4px"});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'roofLight') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "M -8,-8 L 8,8 M -8,8 L 8,-8", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'free';
    }
    if (typeObj == 'wallLight') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "M -8,-8 L 8,8 M -8,8 L 8,-8", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M -10,10 L 10,10", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'www') {
      construc.push({'path': "m -20,-20 l 40,0 l0,40 l-40,0 Z", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "@", 'x': '0', 'y':'4', 'fill': "#333333", 'stroke': "none", 'fontSize': '1.2em',"strokeWidth": "0.4px"});
      construc.params.width = 40;
      construc.params.height = 40;
      construc.family = 'free';
    }
    if (typeObj == 'rj45') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "m-10,5 l0,-10 m20,0 l0,10", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,5 v 7", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m -10,5 h 20", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "RJ45", 'x': '0', 'y':'-5', 'fill': "#333333", 'stroke': "none", 'fontSize': '0.5em',"strokeWidth": "0.4px"});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'tv') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "m-10,5 l0-10 m20,0 l0,10", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-7,-5 l0,7 l14,0 l0,-7", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m 0,5 v 7", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m -10,5 h 20", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "TV", 'x': '0', 'y':'-5', 'fill': "#333333", 'stroke': "none", 'fontSize': '0.5em',"strokeWidth": "0.4px"});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }

    if (typeObj == 'heater') {
      construc.push({'path':qSVG.circlePath(0, 0, 16), 'fill': "#fff", 'stroke': "#000", 'strokeDashArray': ''});
      construc.push({'path': "m-15,-4 l30,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-14,-8 l28,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-11,-12 l22,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-16,0 l32,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-15,4 l30,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-14,8 l28,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "m-11,12 l22,0", 'fill': "none", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 36;
      construc.params.height = 36;
      construc.family = 'stick';
    }
    if (typeObj == 'radiator') {
      construc.push({'path': "m -20,-10 l 40,0 l0,20 l-40,0 Z", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M -15,-10 L -15,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M -10,-10 L -10,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M -5,-10 L -5,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M -0,-10 L -0,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M 5,-10 L 5,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M 10,-10 L 10,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'path': "M 15,-10 L 15,10", 'fill': "#fff", 'stroke': "#333", 'strokeDashArray': ''});
      construc.params.width = 40;
      construc.params.height = 20;
      construc.family = 'stick';
    }
    
    if(['bed','cabinet','doublebed','table'].indexOf(typeObj) >= 0){
      classObj = 'furniture';
      construc.params.width = sizeObj?sizeObj:100; // Resize width/height to obj size/thick
      construc.params.height = thickObj?thickObj:60;
    }

    if (typeObj == 'bed') {
      construc.push({'path': "m "+(-sizeObj/2)+","+(-thickObj/2)+" l "+(sizeObj)+",0 l0,"+(thickObj)+" l"+(-sizeObj)+",0 Z", 'fill': fill, 'stroke': "#333", 'strokeDashArray': ''});
      construc.push({'text': "Bed", 'x': '0', 'y':'5', 'fill': "#333333", 'stroke': "none", 'fontSize': '0.8em',"strokeWidth": "0.4px"});
      construc.family = 'stick';
      construc.params.resizeLimit.width = {min:80, max:200};
      construc.params.resizeLimit.height = {min:30, max:150};
    }

  }

  if (classObj == 'furniture') {
    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.resize = true;
    construc.params.rotate = true;
  }

  if (classObj == 'beam'){

    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.resize = true;
    construc.params.rotate = true;
    construc.params.resize = true;

    construc.params.width = sizeObj?sizeObj:400; // Resize width/height to obj size/thick
    construc.params.height = thickObj?thickObj:20;

    
    if (typeObj == 'simpleBeam'){
      construc.push({'path': "m "+(-sizeObj/2)+","+(-thickObj/2)+" l "+(sizeObj)+",0 l0,"+(thickObj)+" l"+(-sizeObj)+",0 Z", 'fill': fill, 'stroke': "red", 'strokeDashArray': '-'});
      construc.push({'text': "Beam", 'x': '0', 'y':'5', 'fill': "#333333", 'stroke': "red", 'fontSize': '0.8em',"strokeWidth": "0.4px"});
      construc.push({'text': construc.params.width, 'x': '0', 'y': '20', 'fill': "#333333", 'stroke': "red", 'fontSize': '0.8em',"strokeWidth": "0.4px"})
      construc.family = 'stick';
      
      construc.params.resizeLimit.width = {min:10, max:1000};
      construc.params.resizeLimit.height = {min:5, max:1000};
    }
  }

  if (classObj == 'column' ){
    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.resize = true;
    construc.params.columnHeight = true;
    construc.params.typeColumn = true;
    construc.params.demolish = true;

    construc.params.width = sizeObj?sizeObj:50; 
    construc.params.height = thickObj?thickObj:50;

    
    if (typeObj == 'simpleColumn'){
      construc.push({'path': "m "+(-sizeObj/2)+","+(-thickObj/2)+" l "+(sizeObj)+",0 l0,"+(thickObj)+" l"+(-sizeObj)+",0 Z", 'fill': fill, 'stroke': "red", 'strokeDashArray': '-'});
      construc.push({'text': "Column", 'x': '0', 'y':'5', 'fill': "#333333", 'stroke': "black", 'fontSize': '0.8em',"strokeWidth": "0.4px"});
      
      construc.family = 'stick';
      
      construc.params.resizeLimit.width = {min:10, max:500};
      construc.params.resizeLimit.height = {min:10, max:500};
      construc.params.resizeLimit.columnHeight = {min: 10, max: 500}
    }
  }
  
  if (classObj == 'slab' ){
    // While Creating Slab, try to get length equal to labelWidth and height for easy ness...
    var labelWidth = 500;
    var labelHeight = 500;
    if (ROOM.length > 0) {
      var minX, minY, maxX, maxY;
      for (var i = 0; i < WALLS.length; i++) {
        var px = WALLS[i].start.x;
        var py = WALLS[i].start.y;
        if (!i || px < minX) minX = px;
        if (!i || py < minY) minY = py;
        if (!i || px > maxX) maxX = px;
        if (!i || py > maxY) maxY = py;
        var px = WALLS[i].end.x;
        var py = WALLS[i].end.y;
        if (!i || px < minX) minX = px;
        if (!i || py < minY) minY = py;
        if (!i || px > maxX) maxX = px;
        if (!i || py > maxY) maxY = py;
      }

      labelWidth = ((maxX - minX) / meter).toFixed(2) * meter;
      labelHeight = ((maxY - minY) / meter).toFixed(2) * meter;
    }

    construc.params.bindBox = true;
    construc.params.move = true;
    construc.params.resize = true;
    construc.params.rotate = true;
    construc.params.demolish = true;
    construc.params.width = sizeObj?sizeObj:labelWidth; 
    construc.params.height = thickObj?thickObj:labelHeight;
    
    if (typeObj == 'simpleSlab'){
      construc.push({'path': "m "+(-sizeObj/2)+","+(-thickObj/2)+" l "+(sizeObj)+",0 l0,"+(thickObj)+" l"+(-sizeObj)+",0 Z", 'fill': fill, 'stroke': "darkslategray", 'strokeDashArray': '10 3 3 3', 'fillOpacity': '0.1', "strokeWidth": "5px"});      
      construc.push({'text': "Slab", 'x': '0', 'y':thickObj/2-10, 'fill': "#333333", 'stroke': "none", 'fontSize': '1.2em',"strokeWidth": "0.5px"});
      construc.family = 'stick';
      
      construc.params.resizeLimit.width = {min:10, max:10000};
      construc.params.resizeLimit.height = {min:10, max:10000};
    }
  }

  if(classObj == 'roof'){
    WALLS.push({"roof":true,"thick":6,"start":{"x":540,"y":194},"end":{"x":540,"y":734},"type":"normal","parent":Math.round(Math.random()*500),"child":1,"angle":1.5707963267948966,"equations":{"up":{"A":"v","B":550},"down":{"A":"v","B":530},"base":{"A":"v","B":540}},"coords":[{"x":550,"y":204},{"x":530,"y":184},{"x":530,"y":744},{"x":550,"y":724}],"graph":{"0":{},"context":{},"length":1}},{"roof":true,"thick":6,"start":{"x":540,"y":734},"end":{"x":1080,"y":734},"type":"normal","parent":Math.round(Math.random()*500),"child":2,"angle":0,"equations":{"up":{"A":"h","B":724},"down":{"A":"h","B":744},"base":{"A":"h","B":734}},"coords":[{"x":550,"y":724},{"x":530,"y":744},{"x":1090,"y":744},{"x":1070,"y":724}],"graph":{"0":{},"context":{},"length":1}},{"roof":true,"thick":6,"start":{"x":1080,"y":734},"end":{"x":1080,"y":194},"type":"normal","parent":Math.round(Math.random()*500),"child":3,"angle":-1.5707963267948966,"equations":{"up":{"A":"v","B":1070},"down":{"A":"v","B":1090},"base":{"A":"v","B":1080}},"coords":[{"x":1070,"y":724},{"x":1090,"y":744},{"x":1090,"y":184},{"x":1070,"y":204}],"graph":{"0":{},"context":{},"length":1}},{"roof":true,"thick":6,"start":{"x":1080,"y":194},"end":{"x":540,"y":194},"type":"normal","parent":Math.round(Math.random()*500),"child":0,"angle":3.141592653589793,"equations":{"up":{"A":"h","B":204},"down":{"A":"h","B":184},"base":{"A":"h","B":194}},"coords":[{"x":1070,"y":204},{"x":1090,"y":184},{"x":530,"y":184},{"x":550,"y":204}],"graph":{"0":{},"context":{},"length":1}},{"roof":true,"thick":15,"start":{"x":809.5822496304128,"y":194},"end":{"x":809.5822496304128,"y":734},"type":"normal","parent":Math.round(Math.random()*500),"child":null,"angle":1.5707963267948966,"equations":{"up":{"A":"v","B":819.5822496304128},"down":{"A":"v","B":799.5822496304128},"base":{"A":"v","B":809.5822496304128}},"coords":[{"x":819.5822496304128,"y":194},{"x":799.5822496304128,"y":194},{"x":799.5822496304128,"y":734},{"x":819.5822496304128,"y":734}],"backUp":false,"graph":{"0":{},"context":{},"length":1}});
    
    mode = "select_mode";
    rib();
    save();
    load(HISTORY.length - 1);
  }

  return construc;
}
