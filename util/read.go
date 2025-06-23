package util

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type AppData struct {
	AppName string `json:"appName"`
	Calls   string `json:"calls"`
}

type DBData struct {
	DBName     string `json:"dbName"`
	Executions string `json:"executions"`
}

type EUMData struct {
	EUMName     string `json:"name"`
	Requests int `json:"requests"`
}



type UnifiedData struct {
	Name  string
	Count int
}

// Reading and converting data

func ReadUnifiedJSONFileFromDir(dir string) ([]UnifiedData, string, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, "", err
	}
	if len(files) != 1 {
		return nil, "", fmt.Errorf("directory %s must contain exactly one JSON file", dir)
	}

	filePath := filepath.Join(dir, files[0].Name())
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, "", err
	}

	var apps []AppData
	if err := json.Unmarshal(data, &apps); err == nil && len(apps) > 0 && apps[0].AppName != "" {
		return convertAppData(apps), "Application", nil
	}

	var dbs []DBData
	if err := json.Unmarshal(data, &dbs); err == nil && len(dbs) > 0 && dbs[0].DBName != "" {
		return convertDBData(dbs), "Database", nil
	}

	var eums []EUMData
	if err := json.Unmarshal(data, &eums); err == nil && len(eums) > 0 && eums[0].EUMName != "" {
		return convertEUMData(eums), "EUM", nil
	}

	return nil, "", fmt.Errorf("unknown JSON format in %s", filePath)
}

func convertAppData(apps []AppData) []UnifiedData {
	var result []UnifiedData
	for _, a := range apps {
		count := parseNumberWithSuffix(a.Calls)
		result = append(result, UnifiedData{Name: a.AppName, Count: count})
	}
	return result
}

func convertDBData(dbs []DBData) []UnifiedData {
	var result []UnifiedData
	for _, d := range dbs {
		count := parseNumberWithSuffix(d.Executions)
		result = append(result, UnifiedData{Name: d.DBName, Count: count})
	}
	return result
}

func convertEUMData(eum []EUMData) []UnifiedData {
	var result []UnifiedData
	for _, d := range eum {
		result = append(result, UnifiedData{
			Name:  d.EUMName,
			Count: d.Requests,
		})
	}
	return result
}


func parseNumberWithSuffix(s string) int {
	s = strings.ToLower(strings.TrimSpace(s))
	multiplier := 1.0

	switch {
	case strings.HasSuffix(s, "k"):
		multiplier = 1e3
		s = strings.TrimSuffix(s, "k")
	case strings.HasSuffix(s, "m"):
		multiplier = 1e6
		s = strings.TrimSuffix(s, "m")
	case strings.HasSuffix(s, "b"):
		multiplier = 1e9
		s = strings.TrimSuffix(s, "b")
	}

	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return int(val * multiplier)
}
