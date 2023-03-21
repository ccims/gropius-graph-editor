<template>
    <div class="popup__container">
        <div class="popup__content">
            <Wizard
                    squared-tabs
                    :custom-tabs="customTabs"
                    :beforeChange="onTabBeforeChange"
                    @change="onChangeCurrentTab"
                    @complete:wizard="wizardCompleted"
            >
                <div v-if="currentTabIndex === 0">
                    <select
                            class="select"
                            v-model="selectedComponent"
                            @select="onChangeCurrentTab(currentTabIndex)"
                    >
                        <option disabled value="">Please select a component</option>
                        <option v-for="component in componentChoices" :key="component.diagramId" :value="component">
                            {{ component.plainName }}
                        </option>
                    </select>
                </div>
                <div v-if="currentTabIndex === 1">
                    <select class="select" v-model="selectedComponentVersion">
                        <option disabled value="">Please select a version</option>
                        <option v-for="version in componentVersions" :key="version">
                            {{ version }}
                        </option>
                    </select>
                </div>
            </Wizard>
        </div>
    </div>
</template>
<script lang="ts">
import {Options, Vue, prop} from "vue-class-component";
// @ts-ignore
import Wizard from "form-wizard-vue3";
import "form-wizard-vue3/dist/form-wizard-vue3.css";
import GropiusDefaultTypes, {GropiusType} from "@/lib/gropius-compatibility/gropiusDefaultTypes";

class Props {
}

@Options({
    components: {
        Wizard,
    },
    props: {},
})
export default class AddComponent extends Vue.with(Props) {
    // Data
    customTabs: Array<Object> = [{title: "Component"}, {title: "Version"}];
    currentTabIndex: Number = 0;
    componentChoices: Array<GropiusType> = [];
    componentVersions: Array<String> = ["A", "B", "C"];
    selectedComponent?: GropiusType;
    selectedComponentVersion: String = "";

    mounted() {
        this.componentChoices = Array.from(GropiusDefaultTypes.values());
        this.componentChoices.push({
            plainName: "My custom type",
            gropiusId: "shape-custom-mytype",
            diagramId: "rectangle-custom"
        })
    }

    // Computed
    get hideNextButton(): Boolean {
        return this.selectedComponent === null;
    }

    // Methods
    onComponentSelected(componentChoice: String) {
        this.$emit("onComponentSelected", componentChoice);
    }

    stepsCompleted() {
        this.$emit("stepsCompleted");
    }

    // Wizard functions
    /**
     * Changes the currently shown tab
     */
    onChangeCurrentTab(index: Number, oldIndex: Number) {
        this.currentTabIndex = index;
    }

    /**
     * Optional function called before tab is changed
     * Currently not used
     */
    onTabBeforeChange() {
        if (this.currentTabIndex === 0) {
            console.log("First Tab");
        }
        console.log("All Tabs");
    }

    /**
     * Emit to the parent component when steps are completed
     * Steps popup is closed then
     */
    wizardCompleted() {
        ///let selectedComponentType = GropiusDefaultTypes.get
        this.$emit(
            "onChoiceDone",
            this.selectedComponent,
            this.selectedComponentVersion
        );
    }
}
</script>