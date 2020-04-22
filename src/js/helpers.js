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