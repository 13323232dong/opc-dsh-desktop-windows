import Foundation
import Security

private let notFoundExit: Int32 = 2

func fail(_ status: OSStatus) -> Never {
    FileHandle.standardError.write(Data("keychain_error:\(status)\n".utf8))
    exit(1)
}

guard CommandLine.arguments.count == 4 else { exit(64) }
let operation = CommandLine.arguments[1]
let service = CommandLine.arguments[2]
let account = CommandLine.arguments[3]
let baseQuery: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: service,
    kSecAttrAccount as String: account
]

switch operation {
case "get":
    var query = baseQuery
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecItemNotFound { exit(notFoundExit) }
    if status != errSecSuccess { fail(status) }
    guard let data = result as? Data else { exit(65) }
    FileHandle.standardOutput.write(data)

case "set":
    let value = FileHandle.standardInput.readDataToEndOfFile()
    let status = SecItemUpdate(baseQuery as CFDictionary, [kSecValueData as String: value] as CFDictionary)
    if status == errSecItemNotFound {
        var addQuery = baseQuery
        addQuery[kSecValueData as String] = value
        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        if addStatus != errSecSuccess { fail(addStatus) }
    } else if status != errSecSuccess {
        fail(status)
    }

case "remove":
    let status = SecItemDelete(baseQuery as CFDictionary)
    if status == errSecItemNotFound { exit(notFoundExit) }
    if status != errSecSuccess { fail(status) }

default:
    exit(64)
}
