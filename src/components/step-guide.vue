<template>
  <div class="popup__container">
    <div class="popup__content">
      <Wizard
        :custom-tabs="customTabs"
        :beforeChange="onTabBeforeChange"
        @change="onChangeCurrentTab"
        @complete:wizard="wizardCompleted"
      >
        <div v-for="(tabName, tabIndex) in tabNames" :key="tabIndex">
          <slot v-if="currentTabIndex === tabIndex" :name="tabName"></slot>
        </div>
      </Wizard>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue, prop } from "vue-class-component";
// @ts-ignore
import Wizard from "form-wizard-vue3";
import "form-wizard-vue3/dist/form-wizard-vue3.css";

class Props {
  title = prop<string>({ required: false });
  tabTitles = prop<Array<string>>({ required: false });
  tabNames = prop<string>({ required: false });
}

@Options({
  props: {
    title: {
      type: String,
    },
    tabTitles: {
      type: Array,
    },
    tabNames: {
      type: Array,
    },
  },
  components: {
    Wizard,
  },
})
export default class StepGuide extends Vue.with(Props) {
  // Data
  currentTabIndex: Number = 0;

  // Computed
  get customTabs(): Array<Object> {
    let tabTitleArray: Array<Object> = [];
    this.tabTitles?.forEach((tabTitle) => {
      tabTitleArray.push({ title: tabTitle });
    });
    return tabTitleArray;
  }

  // TODO: Tabtitles computed property
  // Methods

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
    this.$emit("stepsCompleted");
  }

  onChoiceDone(choice: String) {
    console.log("onChoiceDone");
    // this.currentTabIndex = this.currentTabIndex + 1;
  }
}
</script>

<style lang="scss" scoped>
.button {
  margin-top: 5px;
}
</style>