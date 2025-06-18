package util

import (
	"fmt"
	"sort"
)

func GenerateDeleteInstructions(oldActive, newDisabled, deleted []string) {
	fmt.Println("\n🧽 Report Cleanup Instructions (Remove from old report):")

	toDelete := append([]string{}, newDisabled...)
	toDelete = append(toDelete, deleted...)
	sort.Strings(toDelete)

	if len(toDelete) == 0 {
		fmt.Println("Nothing needs to be removed from the old report.")
		return
	}

	fmt.Printf("Delete %d item(s) from old report:\n", len(toDelete))
	for _, name := range toDelete {
		index := indexOf(name, oldActive)
		if index != -1 {
			fmt.Printf("- #%d: %s\n", index+1, name)
		} else {
			fmt.Printf("- (not found in Old Active list): %s\n", name)
		}
	}
}

func GenerateAddInstructions(nowActive, totalNew []string) {
	fmt.Println("\n✍️ Report Update Instructions (Add to new report):")

	if len(totalNew) == 0 {
		fmt.Println("No new or re-enabled apps to add.")
		return
	}

	sort.Strings(totalNew)
	fmt.Printf("Add %d item(s) to new report:\n", len(totalNew))
	for _, name := range totalNew {
		index := indexOf(name, nowActive)
		if index != -1 {
			fmt.Printf("- #%d: %s\n", index+1, name)
		} else {
			fmt.Printf("- (not found in Now Active list): %s\n", name)
		}
	}
}
