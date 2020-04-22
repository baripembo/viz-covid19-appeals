//window.$ = window.jQuery = require('jquery');

function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function propComparator(prop) {
    return function(a, b) {
        var comparison = 0;
        if (isNaN(a[prop])) {
            if (a[prop] < b[prop]) {
                comparison = 1;
            } else if (a[prop] > b[prop]) {
                comparison = -1;
            }
        }
        else {
            comparison = a[prop] - b[prop];
        }
        
        return comparison;
    }
}

function getDuration(start, end) {
    var diff = end.getTime() - start.getTime();
    var days = diff / (1000 * 3600 * 24);
    return Math.round(days);
}

function getEndDate(startDate, duration) {
    var endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);
    console.log(startDate, duration, endDate)
    return endDate;
}

function getNum(num) {
    return d3.format('$.2s')(num).replace(/G/, 'B');
}
$( document ).ready(function() {
  const DATA_URL = 'data/';
  var isMobile = $(window).width()<600? true : false;
  var timelinePath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQLlaJ4qXfuVIpcPI1kPxpbrOY4xsVrSPUGxmIj9G_dgUZJTSPZUMi-8i9rB6t_vfVOBVIjaM25T0S/pub?gid=0&single=true&output=csv';
  var timelineData = [];

  var viewportWidth = $('main').innerWidth();
  var categoryColors = {'Humanitarian Response': '#007CE1', 'Health Response': '#1EBFB3', 'Socio-economic Framework': '#F2645A'};
  var timelineStartDate = new Date(2020, 0, 1);
  var timelineEndDate = new Date(2021, 3, 1);
  var today = new Date();
  var dateFormat = d3.timeFormat("%d-%m-%Y");

  function getData() {
    Promise.all([
      d3.csv(timelinePath)
    ]).then(function(data){
      //parse data
      //only display plans at global level for now
      data[0].forEach(function(d) {
        if (d['Level'] == 'Global' && d['Organisation'] !== '') {
          //format start and end dates
          var start = moment(d['Start Date'], ['DD-MMM-YYYY','MM/DD/YYYY']);
          var end = moment(d['End Date'], ['DD-MMM-YYYY','MM/DD/YYYY']);

          //if start date is invalid, set it to today
          d['Start Date'] = (start.isValid()) ? new Date(start.year(), start.month(), start.date()) : today;

          //if end date is invalid, calculate it by duration
          d['Duration (days)'] = (d['Duration (days)'] == '') ? 0 : +d['Duration (days)'];
          d['End Date'] = (end.isValid()) ? new Date(end.year(), end.month(), end.date()) : getEndDate(d['Start Date'], d['Duration (days)']);

          //cut off bars with end dates past the timeline span
          d['capped'] = (d['End Date'].getTime() > timelineEndDate.getTime()) ? true : false;
          d['End Date'] = (d['End Date'].getTime() > timelineEndDate.getTime()) ? timelineEndDate : d['End Date'];

          d['Overall Requirement'] = (d['Revised Requirement'] !== '') ? +d['Revised Requirement'] : d['Original Requirement'];
          timelineData.push(d);
        }
      });

      timelineData.sort(propComparator('Duration (days)'));
      init();
    });
  }

  function init() {
    createTimeline();
    createTable();
    $('.filter-select').change(onFilterSelect);
      
    //remove loader and show vis
    $('.loader').hide();
    $('main, footer').css('opacity', 1);
  }

  function onFilterSelect() {
    var filterMode = $('.filter-select').val();
    timelineData.sort(propComparator(filterMode));
    sortTimeline(filterMode);
  }


  // ********** //
  //  TIMELINE  //
  // ********** //
  var bars, x, y;
  function createTimeline() {
    createLegend();

    var barHeight = 40;
    var barPadding = 12;
    var bottomOffset = 40;
    var margin = {top: 30, right: 30, bottom: 80, left: 0},
        width = viewportWidth - margin.left - margin.right,
        height = (barHeight + barPadding) * timelineData.length;
    
    x = d3.scaleTime()
      .domain([timelineStartDate, timelineEndDate])
      .range([40, width - margin.left - margin.right]);

    // set the ranges
    y = d3.scaleBand().range([height, 30]);
    y.domain(timelineData.map(function(d) { return d['Appeal Name']; }));
              
    var svg = d3.select("#timeline").append("svg")
        .attr("width", width)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([0, 0])
      .html(function(d) { 
        var content ='<h3>'+ d['Appeal Name'] +'</h3>';
        content += 'Duration: '+ d['Duration (days)'] +' Days <hr>';
        content += '<div class="req-container"><div class="req">Original Requirement: <span class="num">'+ getNum(d['Original Requirement']) +'</span>('+ dateFormat(d['Start Date']) +')</div>';
        if (d['Revised Requirement']!=='') content += '<div class="req">Revised Requirement: <span class="num">'+ getNum(d['Revised Requirement']) +'</span>';
        content += (d['Revision Date']!=='') ? '('+ dateFormat(d['Revision Date']) +')</div>' : '</div>'; 
        content += '</div>';
        return content; 
      });

    // add x gridlines
    svg.append("g")     
      .attr("class", "grid")
      .attr("transform", "translate(0," + (height + margin.bottom - bottomOffset) + ")")
      .call(d3.axisBottom(x)
        .tickSize(-(height + margin.bottom - bottomOffset))
        .tickFormat("")
      )

    // add the x axis
    svg.append("g")
      .attr("transform", "translate(0, 0)")
      .call(d3.axisBottom(x)
        .tickFormat(function(d) {
          var yearFormat = d3.timeFormat("%b %Y");
          var monthFormat = d3.timeFormat("%b");
          return (d.getMonth()==0) ? yearFormat(d) : monthFormat(d);
        })
      )

    // add line marker for today
    var todayLine = svg.append("g")
      .attr("transform", function(d, i) { return "translate(" + x(today) + ", 0)"; });

    todayLine.append("line")
      .attr('class', 'today-line')
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", height + margin.bottom - bottomOffset);

    todayLine.append("svg:image")
      .attr("class", "today-marker")
      .attr("xlink:href", "assets/timeline_pointer@2x.png")
      .attr("x", -7.5)
      .attr("y", height + margin.bottom - bottomOffset)    
      .attr("width", "15")
      .attr("height", "26");

    todayLine.append("text")
      .attr("class", "today-label")
      .attr("x", -18)
      .attr("y", height + margin.bottom)
      .text("Today");

    // append bars
    bars = svg.selectAll('.bar')
        .data(timelineData)
      .enter().append('g')
        .attr('class', 'bar-container')
        .attr("transform", function(d, i) { return "translate(" + x(d['Start Date']) + ", " + y(d['Appeal Name']) + ")"; });

    bars.append("rect")
      .attr("class", "bar")
      .attr("fill", function(d) {
        return categoryColors[d['Appeal Type']];
      })
      .attr('opacity', function(d) {
        var o = (d['End Date'].getTime() < today.getTime()) ? 0.5 : 1;
        return o;
      })
      .attr("height", barHeight)
      .attr("width", function(d) {
        var w = x(d['End Date']) - x(d['Start Date']);
        return w;
      });

    //bar caps for appeals with no end date or end date past the timeline
    bars.append('rect')
      .attr("fill", function(d) {
        return categoryColors[d['Appeal Type']];
      })
      .attr("x", function(d) {
        var w = x(d['End Date']) - x(d['Start Date']);
        return w - 20;
      })
      .attr('width', function(d) {
        var w = (d.capped) ? 20 : 0;
        return w;
      })
      .attr("height", barHeight);

    // add org logo
    bars.append("svg:image")
      .attr("class", "org-logo")
      .attr("x", 6)
      .attr("y", 5)    
      .attr("xlink:href", function(d) {
        return "assets/logos/" + d['Organisation'].replace(' ', '') + ".png"
      })
      .attr("width", "29")
      .attr("height", "29");

    //replace missing logo with generic logo
    $('.org-logo').on('error', function(){
      $(this).attr('href', 'assets/logos/generic.png');
    });

    // add org names
    bars.append("text")
      .attr("class", "org-label")
      .attr("x", 40)
      .attr("y", function(d) { return barHeight/2 + 4; })
      .text(function (d) {
        return d['Organisation'];
      });

    d3.selectAll('.bar').call(tip);
    d3.selectAll('.bar-container').on('mouseover', tip.show);
    d3.selectAll('.bar-container').on('mouseleave', tip.hide);
  }

  function createLegend() {
    var arr = []
    for (let [key, value] of Object.entries(categoryColors)) {
      arr.push(key)
    }

    //custom legend
    d3.select('#timeline').insert('div').attr('class', 'timeline-legend').selectAll('div')
      .data(arr)
      .enter().append('div')
      .attr('data-id', function(id) {
        return id;
      })
      .html(function(id) {
        return '<span></span>'+id;
      })
      .each(function(id) {
        d3.select(this).select('span').style('background-color', categoryColors[id]);
      });
  }

  function sortTimeline(dimension) {
    y.domain(timelineData.map(function(d) { return d['Appeal Name']; }));
    bars.transition()
      .duration(400)
      .delay(function(d, i) { return i * 20; })
      .attr("transform", function(d, i) { return "translate(" + x(d['Start Date']) + ", " + y(d['Appeal Name']) + ")"; });
  }


  // ********** //
  // DATA TABLE //
  // ********** //
  function createTable() {
    var dataArray = [];
    timelineData.forEach(function(item, i) {
      var revisedNum = (item['Revised Requirement'] == '') ? '' : getNum(item['Revised Requirement']);
      var itemArray = [
        dateFormat(item['Start Date']),
        dateFormat(item['End Date']),
        item['Duration (days)'],
        item['Organisation'],
        item['Appeal Name'],
        getNum(item['Original Requirement']),
        revisedNum,
        item['Comment'],
        item['Link']
      ];
      dataArray.push(itemArray);
    });
  
    $('#appealsTable').DataTable({
        data: dataArray,
        searchHighlight: true,
        stripeClasses: [ 'odd-row', 'even-row' ],
        columnDefs: [
          {
            "targets": 8,
            "visible": false,
            "searchable": false
          },
          { 
            width: "20%", 
            targets: [4, 7] 
          },
          { 
            targets: 4,
            render: function ( data, type, row ) {
              var link = row[row.length-1];
              var d = (link !== '') ? '<a href="'+ link +'" target="_blank">' + data + '</a>' : data;
              return d;
            }
          }
          // { 
          //   targets: 7,
          //   render: function ( data, type, row ) {
          //     return type === 'display' && data.length > 10 ? data.substr( 0, 10 ) +'…' : data;
          //   }
          // }
        ]
    });
  }

  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = '';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});