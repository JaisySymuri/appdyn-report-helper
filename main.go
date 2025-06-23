package main

import (
	"fmt"
	"report-compare/util"
)

func main() {
	oldData, kindOld, err := util.ReadUnifiedJSONFileFromDir("old-Q")
	if err != nil {
		fmt.Println("❌ Error reading old-Q:", err)
		return
	}

	nowData, kindNow, err := util.ReadUnifiedJSONFileFromDir("new-Q")
	if err != nil {
		fmt.Println("❌ Error reading new-Q:", err)
		return
	}

	if kindOld != kindNow {
		fmt.Printf("❌ Mismatched types: old-Q is %s, new-Q is %s\n", kindOld, kindNow)
		return
	}

	results := util.CompareReports(oldData, nowData)

	util.PrintComparisonResults(kindOld, oldData, nowData, results)

	// Instructions for user to edit reports
	util.GenerateDeleteInstructions(results.OldActive, results.NewDisabled, results.Deleted)
	util.GenerateAddInstructions(results.NowActive, results.TotalNew)
}
