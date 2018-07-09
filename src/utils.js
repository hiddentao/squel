export const defaultQueryBuilderOptions = ({
  // If true then table names will be rendered inside quotes. The quote character used is configurable via the nameQuoteCharacter option.
  autoQuoteTableNames: false,
  // If true then field names will rendered inside quotes. The quote character used is configurable via the nameQuoteCharacter option.
  autoQuoteFieldNames: false,
  // If true then alias names will rendered inside quotes. The quote character used is configurable via the `tableAliasQuoteCharacter` and `fieldAliasQuoteCharacter` options.
  autoQuoteAliasNames: true,
  // If true then table alias names will rendered after AS keyword.
  useAsForTableAliasNames: false,
  // The quote character used for when quoting table and field names
  nameQuoteCharacter: '`',
  // The quote character used for when quoting table alias names
  tableAliasQuoteCharacter: '`',
  // The quote character used for when quoting table alias names
  fieldAliasQuoteCharacter: '"',
  // Custom value handlers where key is the value type and the value is the handler function
  valueHandlers: [],
  // Character used to represent a parameter value
  parameterCharacter: '?',
  // Numbered parameters returned from toParam() as $1, $2, etc.
  numberedParameters: false,
  // Numbered parameters prefix character(s)
  numberedParametersPrefix: '$',
  // Numbered parameters start at this number.
  numberedParametersStartAt: 1,
  // If true then replaces all single quotes within strings. The replacement string used is configurable via the `singleQuoteReplacement` option.
  replaceSingleQuotes: false,
  // The string to replace single quotes with in query strings
  singleQuoteReplacement: '\'\'',
  // String used to join individual blocks in a query when it's stringified
  separator: ' ',
  // Function for formatting string values prior to insertion into query string
  stringFormatter: null,
  // Whether to prevent the addition of brackets () when nesting this query builder's output
  rawNesting: false
})


export const isSquelBuilder = obj => {
  return obj && !!obj._toParamString
}

export const shouldApplyNesting = obj => {
  return (!isSquelBuilder(obj)) || !(obj && obj.options && obj.options.rawNesting)
}

export const registerValueHandler = (handlers, type, handler) => {
  let typeofType = typeof type

  if (typeofType !== 'function' && typeofType !== 'string') {
    throw new Error('type must be a class constructor or string');
  }

  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }

  for (let typeHandlerIndex in handlers) {
    const typeHandler = handlers[typeHandlerIndex]

    if (typeHandler.type === type) {
      typeHandler.handler = handler

      return
    }
  }

  handlers.push({
    type: type,
    handler: handler
  })
}
