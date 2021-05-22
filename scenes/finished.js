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

