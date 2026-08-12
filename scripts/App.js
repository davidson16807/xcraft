'use strict';

(() => {
    const levels = Levels();
    const algebra = EquationOperations();
    const history = AppHistoryTraversal(64);
    const equation_drags = EquationDrags(algebra);
    const drag_ops = AppDragOperations(equation_drags, history);
    const updater = AppUpdater({
        levels: levels,
        history: history,
        drag_ops: drag_ops,
        equation_drags: equation_drags,
    });

    const html = Html(document);
    const equation_view = EquationView({
        html: html,
        algebra: algebra,
        render: katex.render,
    });
    const view = AppView({
        dom: document,
        levels: levels,
        equation_view: equation_view,
        render: katex.render,
    });

    const initial_theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches?
        'night' : 'day';
    const released = equation_drags.release();
    let app = new AppState(
        0,
        levels[0].equation,
        released,
        released.initialize(),
        [],
        [],
        0,
        [],
        initial_theme
    );

    function dispatch(message) {
        const updated = updater.update(message, app);
        if (updated !== app) {
            app = updated;
            view.draw(app);
        }
    }

    view.wire(dispatch);
    view.draw(app);
})();
