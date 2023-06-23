import { createApp } from "vue";
import App from "./App.vue";

// Global styles
// import "./style/button.scss";
// import "./style/popup.scss";
// import "./style/select.scss";

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
    components,
    directives,
})

createApp(App).use(vuetify).mount('#app');