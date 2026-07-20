function lcRationalApprox(val, tol) {
    let num1 = 1, den1 = 0;
    let num2 = Math.floor(val), den2 = 1;
    let rem = val - Math.floor(val);

    while (rem > 1e-6 && Math.abs(val - num2/den2) > tol && den2 < 10000) {
        let a = Math.floor(1.0 / rem);
        rem = 1.0 / rem - a;

        let prevNum = num2, prevDen = den2;
        num2 = a * num2 + num1;
        den2 = a * den2 + den1;

        num1 = prevNum;
        den1 = prevDen;
    }

    return [num2, den2, num1, den1];
}

const W = 494.97;
const H = 80;
const ang = 45;
const A = ang * Math.PI / 180;

const cosA = Math.cos(A);
const sinA = Math.sin(A);

const Y1 = W * sinA;
const Y2 = H * Math.abs(cosA);
const R = Y1 / Y2;

console.log(`Ratio: ${R}`);
const approx = lcRationalApprox(R, 1e-4);
console.log(`Approx: N=${approx[0]}, D=${approx[1]}, n=${approx[2]}, d=${approx[3]}`);

const N = approx[0], D = approx[1], n = approx[2], d = approx[3];

const V1x = W * cosA;
const V1y = -W * sinA;

const V2x = H * sinA;
const V2y = H * cosA;

const sign2 = cosA > 0 ? 1 : -1;

let Lrep = Math.abs(D * V1x + N * sign2 * V2x);
let dX = d * V1x + n * sign2 * V2x;
let dY = d * V1y + n * sign2 * V2y;

console.log(`Original dX: ${dX}, dY: ${dY}`);
if (dY < 0) {
    dX = -dX;
    dY = -dY;
}

console.log(`Final Lrep=${Lrep}, dX=${dX}, dY=${dY}`);
