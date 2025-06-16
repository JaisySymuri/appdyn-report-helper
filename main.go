package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

type AppData struct {
	AppName string `json:"appName"`
	Calls   string `json:"calls"`
}

func readSingleJSONFileFromDir(dir string) ([]AppData, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	if len(files) != 1 {
		return nil, fmt.Errorf("directory %s must contain exactly one JSON file", dir)
	}

	filePath := filepath.Join(dir, files[0].Name())
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var apps []AppData
	err = json.Unmarshal(data, &apps)
	if err != nil {
		return nil, err
	}

	return apps, nil
}

func mapApps(apps []AppData) map[string]int {
	result := make(map[string]int)
	for _, app := range apps {
		calls, err := strconv.Atoi(app.Calls)
		if err != nil {
			continue // skip invalid
		}
		result[app.AppName] = calls
	}
	return result
}

func main() {
	oldApps, err := readSingleJSONFileFromDir("old-Q")
	if err != nil {
		fmt.Println("Error reading old-Q:", err)
		return
	}

	nowApps, err := readSingleJSONFileFromDir("now-Q")
	if err != nil {
		fmt.Println("Error reading now-Q:", err)
		return
	}

	oldMap := mapApps(oldApps)
	nowMap := mapApps(nowApps)

	var disabledApps []string
	var deletedApps []string
	var newApps []string

	// Compare old to now
	for name, oldCalls := range oldMap {
		nowCalls, found := nowMap[name]
		if !found {
			deletedApps = append(deletedApps, name)
		} else if oldCalls > 0 && nowCalls == 0 {
			disabledApps = append(disabledApps, name)
		}
	}

	// Compare now to old (for new apps)
	for name := range nowMap {
		if _, found := oldMap[name]; !found {
			newApps = append(newApps, name)
		}
	}

	fmt.Println("📉 Disabled Apps:")
	if len(disabledApps) == 0 {
		fmt.Println(" - None")
	} else {
		for _, app := range disabledApps {
			fmt.Println(" -", app)
		}
	}

	fmt.Println("\n🗑️ Deleted Apps:")
	if len(deletedApps) == 0 {
		fmt.Println(" - None")
	} else {
		for _, app := range deletedApps {
			fmt.Println(" -", app)
		}
	}

	fmt.Println("\n🆕 New Apps:")
	if len(newApps) == 0 {
		fmt.Println(" - None")
	} else {
		for _, app := range newApps {
			fmt.Println(" -", app)
		}
	}
}
