let capture;
let predictions = []
let model
let stream

let score = 0

const WIDTH = 320
const HEIGHT = 180
const MIDDLE_Y = HEIGHT / 2
const MIDDLE_X = WIDTH / 2

let cameraGraphics
let cameraShader

let images = {}
let pressStart


// let lightColor = 'rgb(217, 165, 179)'
// let darkColor = 'rgb(198, 215, 235)'



function preload() {
    images.butt = loadImage('./img/butt.png')
    images.cook = loadImage('./img/cook.png')
    images.toilet = loadImage('./img/toliet.png')
    images.poop = loadImage('./img/poop.png')
    pressStart = loadFont('./fonts/prstart.ttf')

    cameraGraphics = createGraphics(WIDTH, HEIGHT, WEBGL);
    cameraShader = loadShader('shaders/basic.vert', 'shaders/colorize.frag');
}


/**
 * Do different things depending on the game/scene
 */
class SceneStart {
    onEnter() {

    }

    update() {
        for (const g of players) {
            if (g.mouthOpen) {
                scene = new SceneDelivery()
            }
        }

        // draw --
        drawCameraPixelated()

        // transparency
        background('hsla(0,0%,100%, .9)')
        fill('black')
        textAlign(CENTER)
        textSize(12)

        text("THIRD SPACE", WIDTH / 2, HEIGHT / 2)
        textSize(4)

        if (frameCount / 8 % 8 < 4)
            text("open mouth to play", WIDTH / 2, HEIGHT / 2 + 10)

        // and back
        translate(WIDTH, 0);
        scale(-1, 1);
    }
}

class SceneToilet {
    shits = []

    onEnter() {

    }

    update() {
        drawCameraPixelated()

        // Draw/update all shits
        for (const s of this.shits) {
            s.y += 1

            if (s.y > HEIGHT) {
                this.shits = this.shits.filter(ss => ss != s)
            }

            if (distance(s.x, s.y, players[1].x, players[1].y) < s.r) {
                score++
                this.shits = this.shits.filter(ss => ss != s)
            }

            image(images.poop, s.x, s.y, s.r, s.r)
        }

        // Top 
        if (players[0].present) {
            let buttX = players[0].x - 24
            let buttY = players[0].y - 20

            image(images.butt, buttX, buttY, 50, 50)

            if (players[0].mouthOpen & frameCount % 5 == 0) {
                this.shits.push({
                    x: players[0].x - 10,
                    y: players[0].y,
                    r: 20
                })
            }
        }

        if (players[1].present) {
            image(images.toilet, players[1].x - 24, players[1].y - 20, 50, 50)
        }

        drawScore()
        // Bottom
        // image(images.butt, players[0].x - 24, players[0].y - 20, 50, 50)
    }
}

class SceneDelivery {
    onEnter() {

    }

    update() {
        drawCameraPixelated()

        for (const g of players) {
            g.draw()
        }

        for (const o of objectsToGrab) {
            fill('red')
            ellipse(o.x, o.y, o.r)
        }

        for (const d of dropZones) {
            d.update()
            d.draw()
        }

        // Draw hat
        if (predictions[0]) {
            const [x, y, z] = predictions[0].annotations.midwayBetweenEyes[0]
            image(images.poop, x, y, 40, 40)
        }
    }
}

class SceneFinished {
    onEnter() {

    }

    update() {
        // draw --
        drawCameraPixelated()

        // transparency
        background('hsla(0,0%,100%, .9)')
        fill('black')
        resetMatrix(); // reset
        textAlign(CENTER)
        textSize(12)

        text("FINISHED", WIDTH / 2, HEIGHT / 2)
        textSize(5)

        // and back
        translate(WIDTH, 0);
        scale(-1, 1);
    }
}


let scene = new SceneToilet()


class MouthParticle {
    r = 0

    constructor(x, y, player) {
        this.x = x
        this.y = y
        this.player = player
    }

    update() {
        this.r++
    }

    draw() {
        stroke('red')
        noFill()
        ellipse(this.x, this.y, this.r)
    }
}

class DropZone {
    constructor(x, y, r) {
        this.x = x
        this.y = y
        this.r = r
    }

    update() {
        for (const o of objectsToGrab) {
            if (distance(this.x, this.y, o.x, o.y) < this.r / 2) {
                objectsToGrab = objectsToGrab.filter(oo => oo != o)
                score += 1

                // Spawn a new one
                objectsToGrab.push({
                    x: random(WIDTH),
                    y: random(HEIGHT),
                    r: 10
                })
            }
        }
    }

    draw() {
        fill('white')
        noStroke()
        ellipse(this.x, this.y, this.r)
    }
}


class Player {
    x = 0
    y = 0

    mouthOpen = false // boolean
    dragging = null // A SceneObject
    inRange = null // A SceneObject
    justReleased = null // A SceneObject
    justOpened = false
    justClosed = false
    mouthParticles = []
    present = true

    update(prediction) {
        const {
            lipsLowerInner,
            lipsUpperInner
        } = prediction.annotations

        // Calculate positions
        const lipsLowerInnerCoords = lipsLowerInner[5]
        const lipsUpperInnerCoords = lipsUpperInner[5]
        const lowerLipsY = lipsLowerInnerCoords[1]
        const upperLipsY = lipsUpperInnerCoords[1]
        const mouthX = this.x = lipsLowerInnerCoords[0]
        const mouthY = this.y = (lowerLipsY + upperLipsY) / 2
        const mouthZ = lipsLowerInnerCoords[2] / 2

        // Update 
        this.justClosed = false
        this.justOpened = false

        const difference = lipsLowerInner[5][1] - lipsUpperInner[5][1]

        let lastMouthOpen = this.mouthOpen
        this.mouthOpen = difference > 10

        if (lastMouthOpen && !this.mouthOpen) {
            this.justClosed = true
            this.justOpened = false
        } else if (!lastMouthOpen && this.mouthOpen) {
            this.justOpened = true
            this.justClosed = false
        }

        let anyInRange = false

        for (const o of objectsToGrab) {
            if (distance(mouthX, lowerLipsY, o.x, o.y) < o.r / 2) {
                this.inRange = o
                anyInRange = true

                if (this.justClosed && this.mouthOpen == false) {
                    this.dragging = o
                }
            }

            if (this.dragging == o) {
                o.x = lerp(mouthX, o.x, 0.25)
                o.y = lerp(lowerLipsY, o.y, 0.25)
            }
        }

        if (this.mouthOpen) {
            this.dragging = null

            if (frameCount % 5 == 0) {
                this.mouthParticles.push(new MouthParticle(mouthX, mouthY))
            }
        }

        for (const particle of this.mouthParticles) {
            particle.update()
            if (particle.r > 20) {
                this.mouthParticles = this.mouthParticles.filter(p => p != particle)
            }
        }

        if (!anyInRange) {
            this.inRange = null
        }
    }

    draw() {
        // Draw
        for (const particle of this.mouthParticles) {
            particle.draw()
        }

    }
}

let players = [
    new Player(),
    new Player(),
    new Player(),
    new Player(),
]


let objectsToGrab = [
    {
        x: 50,
        y: 50,
        r: 10
    },
    {
        x: 30,
        y: 30,
        r: 10
    }
]


let dropZones = [
    new DropZone(80, 80, 10)
]



/**
 * Main
 */
function setup() {
    createCanvas(WIDTH, HEIGHT);
    // pixelDensity(1)

    // Init video
    // capture = createVideo(['Untitled Project 2.mov']);
    // capture.loop()
    // video.size(WIDTH, HEIGHT)

    capture = createCapture(VIDEO);

    capture.hide();




    setupFaceDetection()


    textFont(pressStart)
}


async function setupFaceDetection() {
    model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages
        .mediapipeFacemesh, {
        maxFaces: 4,
        shouldLoadIrisModel: false
    });

    setInterval(updateFaces, 32)
}


async function updateFaces() {
    predictions = await model.estimateFaces({
        input: capture.elt,
        predictIrises: false
    });

    predictions = predictions.sort((a, b) => {
        return a.boundingBox.topLeft[1] - b.boundingBox.topLeft[1]
    })

    // if (predictions.length == 2) {
    //     let prediction0 = predictions.find(p => (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 < MIDDLE_Y)
    //     let prediction1 = predictions.find(p => (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 > MIDDLE_Y)

    //     if (prediction0) {
    //         players[0].present = true
    //         players[0].update(prediction0)
    //     } else {
    //         players[0].present = false
    //     }

    //     if (prediction1) {
    //         players[1].present = true
    //         players[1].update(prediction1)
    //     } else {
    //         players[1].present = false
    //     }
    // }

    if (predictions.length == 4) {
        let prediction0 = predictions.find(p =>
            (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 < MIDDLE_X &&
            (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 < MIDDLE_Y)

        let prediction1 = predictions.find(p =>
            (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 > MIDDLE_X &&
            (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 < MIDDLE_Y)

        let prediction2 = predictions.find(p =>
            (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 < MIDDLE_X &&
            (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 > MIDDLE_Y)

        let prediction3 = predictions.find(p =>
            (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 > MIDDLE_X &&
            (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 > MIDDLE_Y)

        if (prediction0) {
            players[0].present = true
            players[0].update(prediction0)
        } else {
            players[0].present = false
        }

        if (prediction1) {
            players[1].present = true
            players[1].update(prediction1)
        } else {
            players[1].present = false
        }

        if (prediction2) {
            players[2].present = true
            players[2].update(prediction0)
        } else {
            players[2].present = false
        }

        if (prediction3) {
            players[3].present = true
            players[3].update(prediction1)
        } else {
            players[3].present = false
        }
    }



    // for (let i = 0; i < predictions.length; i++) {
    //     const prediction = predictions[i];
    //     const player = players[i];

    // }
}




function drawCameraPixelated() {
    background('white')
    cameraGraphics.shader(cameraShader)
    cameraShader.setUniform('tex0', capture);
    cameraGraphics.rect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

    scale(-1, 1);
    translate(-WIDTH, 0);
    image(cameraGraphics, 0, 0, WIDTH, HEIGHT);

    resetMatrix(); // reset
}

function drawScore() {
    translate(WIDTH, 0);
    scale(-1, 1);

    textSize(8)
    fill('red')
    text(`${score}`, WIDTH - players[1].x, players[1].y)

    resetMatrix()

}


function drawFaceDebug() {
    stroke('red')
    noFill()
    strokeWeight(1)
    line(0, HEIGHT / 2, WIDTH, HEIGHT / 2)
    line(MIDDLE_X, 0, MIDDLE_X, HEIGHT)

    console.log(predictions.length)
    for (const p of predictions) {
        const { topLeft, bottomRight } = p.boundingBox
        const faceMiddleY = (topLeft[1] + bottomRight[1]) / 2
        const faceMiddleX = (topLeft[0] + bottomRight[0]) / 2

        rect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1])
        line(topLeft[0], faceMiddleY, bottomRight[0], faceMiddleY)
        line(faceMiddleX, topLeft[1], faceMiddleX, bottomRight[1])
    }

}


function draw() {
    /**
    * Always track the faces
    */
    // updateFaces()


    /**
     * Do different things depending on the scene
     */
    scene.update()

    drawFaceDebug()
}


function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}