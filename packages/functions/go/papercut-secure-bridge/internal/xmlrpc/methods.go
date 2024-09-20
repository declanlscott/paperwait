package xmlrpc

const (
	MethodPrefix                      = "api."
	AdjustSharedAccountAccountBalance = "adjustSharedAccountAccountBalance"
	GetSharedAccountProperties        = "getSharedAccountProperties"
	IsUserExists                      = "isUserExists"
	ListSharedAccounts                = "listSharedAccounts"
	ListUserSharedAccounts            = "listUserSharedAccounts"
)

type AdjustSharedAccountAccountBalanceRequestBody struct {
	SharedAccountName string  `json:"sharedAccountName"`
	Adjustment        float64 `json:"adjustment"`
	Comment           string  `json:"comment"`
}
type AdjustSharedAccountAccountBalanceArgs struct {
	AuthToken         string
	SharedAccountName string
	Adjustment        float64
	Comment           string
}
type AdjustSharedAccountAccountBalanceReply struct {
	Success bool `json:"success"`
}

type GetSharedAccountPropertiesRequestBody struct {
	SharedAccountName string   `json:"sharedAccountName"`
	Properties        []string `json:"properties"`
}
type GetSharedAccountPropertiesArgs struct {
	AuthToken         string
	SharedAccountName string
	Properties        []string
}
type GetSharedAccountPropertiesReply struct {
	Properties []any
}

type ListSharedAccountsRequestBody struct {
	Offset int `json:"offset"`
	Limit  int `json:"limit"`
}
type ListSharedAccountsArgs struct {
	AuthToken string
	Offset    int
	Limit     int
}
type ListSharedAccountsReply struct {
	SharedAccounts []any `json:"sharedAccounts"`
}

type ListUserSharedAccountsRequestBody struct {
	Username                         string `json:"username"`
	Offset                           int    `json:"offset"`
	Limit                            int    `json:"limit"`
	IgnoreUserAccountSelectionConfig bool   `json:"ignoreUserAccountSelectionConfig"`
}
type ListUserSharedAccountsArgs struct {
	AuthToken                        string
	Username                         string
	Offset                           int
	Limit                            int
	IgnoreUserAccountSelectionConfig bool
}
type ListUserSharedAccountsReply struct {
	UserSharedAccounts []any `json:"userSharedAccounts"`
}

type IsUserExistsRequestBody struct {
	Username string `json:"username"`
}
type IsUserExistsArgs struct {
	AuthToken string
	Username  string
}
type IsUserExistsReply struct {
	Exists bool `json:"exists"`
}
