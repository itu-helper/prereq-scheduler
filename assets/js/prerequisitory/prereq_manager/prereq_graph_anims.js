function register_intro_anims(self, anim_dur) {
    G6.registerEdge('node-dashed-intro', {
        afterDraw(cfg, group) {
            if (!self.animatePrereqChains) return;

            const shape = group.get('children')[0];
            let cycleLength = 20;
            if (cfg.style && cfg.style.lineDash) {
                cycleLength = cfg.style.lineDash.reduce((a, b) => a + b, 0);
            }

            shape.animate(
                (ratio) => {
                    const diff = ratio * cycleLength;
                    return {
                        lineDashOffset: -diff,
                    };
                },
                {
                    repeat: true,
                    duration: anim_dur,
                }
            );
        }
    }, 'cubic-vertical');

    G6.registerEdge('edge-intro', {
        afterDraw(cfg, group) {
            if (!self.animateIntro) return;

            const shape = group.get('children')[0];
            const length = shape.getTotalLength();
            shape.animate(
                (ratio) => {
                    const startLen = ratio * length;
                    return {
                        lineDash: [startLen, length - startLen],
                    };
                },
                {
                    repeat: false,
                    duration: anim_dur,
                }
            );
        }
    }, 'cubic-vertical');

    G6.registerNode('node-intro', {
        afterDraw(cfg, group) {
            if (!self.animateIntro) return;

            if (group.get('hasAnimated')) return;
            group.set('hasAnimated', true);

            const shapes = group.get('children');
            shapes.forEach(shape => {
                const targetFillOpacity = shape.attr('fillOpacity');
                const targetStrokeOpacity = shape.attr('strokeOpacity');
                const targetOpacity = shape.attr('opacity');

                const animateCfg = {};

                if (targetFillOpacity !== undefined) {
                    animateCfg.fillOpacity = targetFillOpacity;
                    shape.attr('fillOpacity', 0);
                }
                if (targetStrokeOpacity !== undefined) {
                    animateCfg.strokeOpacity = targetStrokeOpacity;
                    shape.attr('strokeOpacity', 0);
                }
                if (targetOpacity !== undefined) {
                    animateCfg.opacity = targetOpacity;
                    shape.attr('opacity', 0);
                } else if (shape.get('type') === 'text') {
                    animateCfg.opacity = 1;
                    shape.attr('opacity', 0);
                }

                if (Object.keys(animateCfg).length > 0) {
                    shape.animate(
                        (ratio) => {
                            const style = {};
                            for (const key in animateCfg) {
                                style[key] = animateCfg[key] * ratio;
                            }
                            return style;
                        },
                        {
                            duration: anim_dur,
                        }
                    );
                }
            });
        }
    }, 'rect');
}