package util

import (
	"fmt"
	"sort"
)

func PrintCategory(title string, items []string) {
	fmt.Printf("\n%s:\n", title)
	if len(items) == 0 {
		fmt.Println("- None")
		return
	}
	sort.Strings(items)
	for _, name := range items {
		fmt.Printf(" - %s\n", name)
	}
}

func PrintSortedList(title string, items []string) {
	fmt.Printf("\n%s (%d):\n", title, len(items))
	for _, name := range items {
		fmt.Println(name)
	}
}

func PrintNumberedList(title string, items []string) {
	fmt.Printf("\n%s:\n", title)
	for i, name := range items {
		fmt.Printf("%d. %s\n", i+1, name)
	}
}

func mapUnified(data []UnifiedData) map[string]int {
	result := make(map[string]int)
	for _, item := range data {
		result[item.Name] = item.Count
	}
	return result
}

func indexOf(target string, list []string) int {
	for i, v := range list {
		if v == target {
			return i
		}
	}
	return -1
}
