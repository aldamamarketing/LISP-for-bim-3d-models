function round(val, dec = 4) { return Number(Math.round(val + 'e' + dec) + 'e-' + dec); }

function getCollinearGroups(segments) {
    const groups = {};
    segments.forEach(seg => {
        let x1 = round(seg.x1); let y1 = round(seg.y1);
        let x2 = round(seg.x2); let y2 = round(seg.y2);
        
        let dx = round(x2 - x1);
        let dy = round(y2 - y1);
        if (dx === 0 && dy === 0) return;
        
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        let groupAngle = angle % 180;
        groupAngle = round(groupAngle);
        
        let theta = groupAngle * Math.PI / 180;
        let c = round(x1 * Math.sin(theta) - y1 * Math.cos(theta));
        
        let t1 = round(x1 * Math.cos(theta) + y1 * Math.sin(theta));
        let t2 = round(x2 * Math.cos(theta) + y2 * Math.sin(theta));
        
        const key = groupAngle + '_' + c;
        if (!groups[key]) groups[key] = { angle: groupAngle, c: c, segs: [] };
        
        groups[key].segs.push({ min: Math.min(t1, t2), max: Math.max(t1, t2), originalAngle: angle });
    });
    return groups;
}

let segs = [
    {x1: 0, y1: 0, x2: 10, y2: 10},
    {x1: 10, y1: 10, x2: 20, y2: 20},
    {x1: 30, y1: 30, x2: 40, y2: 40}
];

let g = getCollinearGroups(segs);
console.log(JSON.stringify(g, null, 2));
