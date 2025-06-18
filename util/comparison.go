package util

import (
	"fmt"
	"sort"
	"strings"
)

type ComparisonResult struct {
	NewDisabled   []string
	StillDisabled []string
	Reenabled     []string
	Unchanged     []string
	Deleted       []string
	NewItems      []string
	TotalNew      []string
	TotalDisabled []string
	NowActive     []string
	OldActive     []string
}

func CompareReports(oldData, nowData []UnifiedData) ComparisonResult {
	oldMap := mapUnified(oldData)
	nowMap := mapUnified(nowData)

	var res ComparisonResult

	for name, oldVal := range oldMap {
		nowVal, found := nowMap[name]
		switch {
		case !found:
			res.Deleted = append(res.Deleted, name)
		case oldVal > 0 && nowVal == 0:
			res.NewDisabled = append(res.NewDisabled, name)
		case oldVal == 0 && nowVal == 0:
			res.StillDisabled = append(res.StillDisabled, name)
		case oldVal == 0 && nowVal > 0:
			res.Reenabled = append(res.Reenabled, name)
		case oldVal > 0 && nowVal > 0:
			res.Unchanged = append(res.Unchanged, name)
		}
	}

	for name := range nowMap {
		if _, found := oldMap[name]; !found {
			res.NewItems = append(res.NewItems, name)
		}
	}

	// Compute totals
	res.TotalNew = append([]string{}, res.NewItems...)
	res.TotalNew = append(res.TotalNew, res.Reenabled...)
	sort.Slice(res.TotalNew, func(i, j int) bool {
		return strings.ToLower(res.TotalNew[i]) < strings.ToLower(res.TotalNew[j])
	})

	res.TotalDisabled = append([]string{}, res.NewDisabled...)
	res.TotalDisabled = append(res.TotalDisabled, res.StillDisabled...)
	res.TotalDisabled = append(res.TotalDisabled, res.Deleted...)
	sort.Slice(res.TotalDisabled, func(i, j int) bool {
		return strings.ToLower(res.TotalDisabled[i]) < strings.ToLower(res.TotalDisabled[j])
	})

	fmt.Println("DEBUG Sorted TotalDisabled:")
for _, v := range res.TotalDisabled {
	fmt.Println(v)
}

	res.NowActive = append([]string{}, res.Unchanged...)
	res.NowActive = append(res.NowActive, res.TotalNew...)
	sort.Slice(res.NowActive, func(i, j int) bool {
		return strings.ToLower(res.NowActive[i]) < strings.ToLower(res.NowActive[j])
	})

	res.OldActive = append([]string{}, res.Unchanged...)
	res.OldActive = append(res.OldActive, res.NewDisabled...)
	sort.Slice(res.OldActive, func(i, j int) bool {
		return strings.ToLower(res.OldActive[i]) < strings.ToLower(res.OldActive[j])
	})


	return res
}
