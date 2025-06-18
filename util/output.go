package util

import "fmt"

func PrintComparisonResults(kind string, oldData, nowData []UnifiedData, r ComparisonResult) {
	fmt.Printf("🔍 Comparing type: %s\n", kind)
	fmt.Printf("📦 Total in old-Q: %d\n", len(oldData))
	fmt.Printf("📦 Total in now-Q: %d\n", len(nowData))

	PrintCategory("📉 New Disabled (was active, now 0)", r.NewDisabled)
	PrintCategory("📴 Still Disabled (was 0, remains 0)", r.StillDisabled)
	PrintCategory("✅ Re-enabled (was 0, now active)", r.Reenabled)
	PrintCategory("🔄 Unchanged (still active)", r.Unchanged)
	PrintCategory("🗑️ Deleted (gone now)", r.Deleted)
	PrintCategory("🆕 New (not in old)", r.NewItems)

	fmt.Println("\n📊 Conclusion")

	PrintSortedList("✅ Existing (unchanged)", r.Unchanged)
	PrintSortedList("🆕 Total New (new + re-enabled)", r.TotalNew)
	PrintSortedList("📴 Total Disabled (new disabled + still disabled + deleted)", r.TotalDisabled)

	PrintNumberedList("📌 Now Active (Existing + Total New)", r.NowActive)
	PrintNumberedList("📂 Old Active (Existed before and was active)", r.OldActive)
}
