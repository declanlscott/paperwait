package handler

import (
	"context"
	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
	"os"
	"papercut-secure-bridge/internal/xmlrpc"
	"testing"
)

func TestHandler_adjustSharedAccountAccountBalance(t *testing.T) {
	sharedAccountName := os.Getenv("TEST_SHARED_ACCOUNT_NAME")
	if sharedAccountName == "" {
		t.Fatal("TEST_SHARED_ACCOUNT_NAME environment variable is not set")
	}

	body, err := json.Marshal(xmlrpc.AdjustSharedAccountAccountBalanceRequestBody{
		SharedAccountName: sharedAccountName,
		Adjustment:        0,
		Comment:           "Test adjustment",
	})
	if err != nil {
		t.Fatal(err)
	}

	_, err = Handler(context.TODO(), events.APIGatewayV2HTTPRequest{
		PathParameters: map[string]string{"method": "adjustSharedAccountAccountBalance"},
		Body:           string(body),
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestHandler_getSharedAccountProperties(t *testing.T) {
	sharedAccountName := os.Getenv("TEST_SHARED_ACCOUNT_NAME")
	if sharedAccountName == "" {
		t.Fatal("TEST_SHARED_ACCOUNT_NAME environment variable is not set")
	}

	body, err := json.Marshal(xmlrpc.GetSharedAccountPropertiesRequestBody{
		SharedAccountName: sharedAccountName,
		Properties:        []string{"account-id"},
	})
	if err != nil {
		t.Fatal(err)
	}

	_, err = Handler(context.TODO(), events.APIGatewayV2HTTPRequest{
		PathParameters: map[string]string{"method": "getSharedAccountProperties"},
		Body:           string(body),
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestHandler_isUserExists(t *testing.T) {
	username := os.Getenv("TEST_USERNAME")
	if username == "" {
		t.Fatal("TEST_USERNAME environment variable is not set")
	}

	body, err := json.Marshal(xmlrpc.IsUserExistsRequestBody{
		Username: username,
	})
	if err != nil {
		t.Fatal(err)
	}

	_, err = Handler(context.TODO(), events.APIGatewayV2HTTPRequest{
		PathParameters: map[string]string{"method": "isUserExists"},
		Body:           string(body),
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestHandler_listSharedAccounts(t *testing.T) {
	body, err := json.Marshal(xmlrpc.ListSharedAccountsRequestBody{
		Offset: 0,
		Limit:  1000,
	})
	if err != nil {
		t.Fatal(err)
	}

	_, err = Handler(context.TODO(), events.APIGatewayV2HTTPRequest{
		PathParameters: map[string]string{"method": "listSharedAccounts"},
		Body:           string(body),
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestHandler_listUserSharedAccounts(t *testing.T) {
	username := os.Getenv("TEST_USERNAME")
	if username == "" {
		t.Fatal("TEST_USERNAME environment variable is not set")
	}

	body, err := json.Marshal(xmlrpc.ListUserSharedAccountsRequestBody{
		Username:                         username,
		Offset:                           0,
		Limit:                            1000,
		IgnoreUserAccountSelectionConfig: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	_, err = Handler(context.TODO(), events.APIGatewayV2HTTPRequest{
		PathParameters: map[string]string{"method": "listUserSharedAccounts"},
		Body:           string(body),
	})
	if err != nil {
		t.Fatal(err)
	}
}
