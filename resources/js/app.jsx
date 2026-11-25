import '../css/app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import Swal from 'sweetalert2';

const emptyFlash = {
    success: null,
    error: null,
    login_success: null,
    logout_success: null,
};

const closeActiveAlert = () => {
    if (Swal.isVisible()) {
        Swal.close();
    }
};

router.on('before', (event) => {
    const visit = event.detail?.visit;
    const isGetNavigation = (visit?.method || 'get').toLowerCase() === 'get';
    const isPartialReload = Array.isArray(visit?.only) && visit.only.length > 0;

    if (isGetNavigation && !isPartialReload && !Swal.isLoading()) {
        closeActiveAlert();
    }
});
window.addEventListener('popstate', closeActiveAlert);

router.on('navigate', (event) => {
    const page = event.detail?.page;
    const flash = page?.props?.flash;

    if (!flash || !Object.values(flash).some(Boolean)) {
        return;
    }

    const navigatedHref = window.location.href;

    setTimeout(() => {
        page.props.flash = { ...emptyFlash };

        if (window.location.href !== navigatedHref) {
            return;
        }

        const state = window.history.state;
        if (!state || typeof state !== 'object') {
            return;
        }

        if (state.props?.flash) {
            window.history.replaceState(
                { ...state, props: { ...state.props, flash: { ...emptyFlash } } },
                '',
                navigatedHref,
            );
        } else if (state.page?.props?.flash) {
            window.history.replaceState(
                { ...state, page: { ...state.page, props: { ...state.page.props, flash: { ...emptyFlash } } } },
                '',
                navigatedHref,
            );
        }
    }, 100);
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
