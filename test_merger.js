const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');

// Simplified line extraction
function extractLines(svgText) {
    const root = parse(svgText);
    const paths = root.querySelectorAll('path');
    let segments = [];
    paths.forEach(p => {
        const d = p.getAttribute('d');
        if (!d) return;
        const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
        let curX = 0, curY = 0, startX = 0, startY = 0;
        commands.forEach(cmdStr => {
            const cmd = cmdStr[0];
            const args = cmdStr.slice(1).trim().split(/[ ,\n\r]+/).map(parseFloat).filter(n => !isNaN(n));
            if (cmd === 'M') {
                curX = args[0]; curY = args[1];
                startX = curX; startY = curY;
            } else if (cmd === 'L') {
                for (let i = 0; i < args.length; i += 2) {
                    segments.push({ x1: curX, y1: curY, x2: args[i], y2: args[i+1] });
                    curX = args[i]; curY = args[i+1];
                }
            } else if (cmd === 'z' || cmd === 'Z') {
                segments.push({ x1: curX, y1: curY, x2: startX, y2: startY });
                curX = startX; curY = startY;
            }
        });
    });
    return segments;
}

// Math logic to group and merge collinear segments
function round(val, dec = 5) { return Number(Math.round(val + 'e' + dec) + 'e-' + dec); }

function mergeCollinear(segments, width, height) {
    // 1. Calculate Angle & Y-Intercept (or X-intercept for verticals) to group lines
    const groups = {};
    
    segments.forEach(seg => {
        // SVG coordinates: y is down, convert to PAT (y is up) -> y = -y
        let x1 = round(seg.x1); let y1 = round(-seg.y1);
        let x2 = round(seg.x2); let y2 = round(-seg.y2);
        
        let dx = round(x2 - x1);
        let dy = round(y2 - y1);
        
        if (dx === 0 && dy === 0) return; // ignore zero-length
        
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        
        // Normalize angle to 0-180 for collinear grouping
        let groupAngle = angle;
        if (groupAngle >= 180) groupAngle -= 180;
        groupAngle = round(groupAngle);
        
        let intercept;
        if (groupAngle === 90) {
            intercept = round(x1); // Vertical, group by X
        } else {
            // y = mx + b => b = y - mx
            let m = dy / dx;
            intercept = round(y1 - (m * x1)); 
        }
        
        const key = \\_\\;
        if (!groups[key]) groups[key] = { angle: groupAngle, intercept: intercept, segs: [] };
        
        // Sort coordinates for 1D merging
        if (groupAngle === 90) {
            groups[key].segs.push({ min: Math.min(y1, y2), max: Math.max(y1, y2), originalAngle: angle });
        } else {
            groups[key].segs.push({ min: Math.min(x1, x2), max: Math.max(x1, x2), originalAngle: angle });
        }
    });

    let mergedCount = 0;
    Object.keys(groups).forEach(k => {
        let segs = groups[k].segs.sort((a, b) => a.min - b.min);
        let merged = [segs[0]];
        for (let i = 1; i < segs.length; i++) {
            let last = merged[merged.length - 1];
            // If they overlap or touch (with tiny margin)
            if (segs[i].min <= last.max + 0.1) {
                last.max = Math.max(last.max, segs[i].max);
            } else {
                merged.push(segs[i]);
            }
        }
        groups[k].merged = merged;
        mergedCount += merged.length;
    });
    
    return { original: segments.length, merged: mergedCount };
}

const file = 'web/public/patterns/1_3_running_bond.svg';
const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
const segs = extractLines(text);
const res = mergeCollinear(segs, 2700, 900);

console.log(\\: Lineas SVG originales: \, Lineas PAT Optimizadas: \\);
