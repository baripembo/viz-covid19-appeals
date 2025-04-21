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
    return endDate;
}

function getNum(val) {
    var n = (isNaN(val)) ? val : d3.format('$.3s')(val).replace(/G/, 'B');
    return n;
}