const DELIVERY_ZONE_THICKNESS = 20

class SceneDelivery {
    deliveryZones = {
        topLeft: {
            right: {
                x: MIDDLE_X - DELIVERY_ZONE_THICKNESS,
                y: 0,
                width: DELIVERY_ZONE_THICKNESS,
                height: MIDDLE_Y,
            },

            bottom: {
                x: 0,
                y: MIDDLE_Y - DELIVERY_ZONE_THICKNESS,
                width: MIDDLE_X,
                height: DELIVERY_ZONE_THICKNESS
            }
        },

        topRight: {
            left: {
                x: MIDDLE_X,
                y: 0,
                width: DELIVERY_ZONE_THICKNESS,
                height: MIDDLE_Y
            },

            bottom: {
                x: MIDDLE_X,
                y: MIDDLE_Y - DELIVERY_ZONE_THICKNESS,
                width: MIDDLE_X,
                height: DELIVERY_ZONE_THICKNESS
            }
        },

        bottomLeft: {
            right: {
                x: 0,
                y: MIDDLE_Y,
                width: MIDDLE_X,
                height: DELIVERY_ZONE_THICKNESS
            },

            top: {
                x: MIDDLE_X - DELIVERY_ZONE_THICKNESS,
                y: MIDDLE_Y,
                width: DELIVERY_ZONE_THICKNESS,
                height: MIDDLE_Y
            }
        },

        bottomRight: {
            left: {
                x: MIDDLE_X,
                y: MIDDLE_Y,
                width: MIDDLE_X,
                height: DELIVERY_ZONE_THICKNESS
            },

            top: {
                x: MIDDLE_X,
                y: MIDDLE_Y,
                width: DELIVERY_ZONE_THICKNESS,
                height: MIDDLE_Y
            }
        }
    }


    onEnter() {

    }

    drawDeliveryZones() {
        stroke('white')

        for (const zones of Object.values(this.deliveryZones)) {
            for (const deliveryZone of Object.values(zones)) {
                rect(deliveryZone.x, deliveryZone.y, deliveryZone.width, deliveryZone.height)
            }
        }
    }

    update() {
        drawCameraPixelated()
        this.drawDeliveryZones()

        // draw score in the center of the screen


        for (const player of players) {
            player.draw()


            console.log(player.justReleased)


            /**
             * Drag and dropping
             */
            let anyInRange = false

            for (const o of objectsToGrab) {
                if (distance(player.x, player.y, o.x, o.y) < o.r / 2) {
                    player.inRange = o
                    anyInRange = true

                    if (player.justClosed && player.mouthOpen == false) {
                        player.dragging = o
                    }
                }

                if (player.dragging == o) {
                    o.x = lerp(player.x, o.x, 0.25)
                    o.y = lerp(player.y, o.y, 0.25)
                }
            }

            if (player.mouthOpen) {
                player.dragging = null

                if (frameCount % 5 == 0) {
                    player.mouthParticles.push(new MouthParticle(player.x, player.y))
                }
            }

            if (player.justReleased) {
                for (const [quadrantName, quadrant] of Object.entries(this.deliveryZones)) {
                    for (const [zoneName, deliveryZone] of Object.entries(quadrant)) {
                        if (player.justReleased.x > deliveryZone.x
                            && player.justReleased.y > deliveryZone.y
                            && player.justReleased.x < deliveryZone.x + deliveryZone.width
                            && player.justReleased.y < deliveryZone.y + deliveryZone.height) {
                            player.justReleased.x = random(WIDTH)
                            player.justReleased.y = random(HEIGHT)
                        }
                    }
                }
            }

            if (!anyInRange) {
                player.inRange = null
            }

            /**
             * Updating particles
             */
            for (const particle of player.mouthParticles) {
                particle.update()
                if (particle.r > 20) {
                    player.mouthParticles = player.mouthParticles.filter(p => p != particle)
                }
            }
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
            // image(images.poop, x, y, 40, 40)
        }
    }
}