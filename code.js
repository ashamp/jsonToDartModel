
$(function () {
  //初始化
  (function init() {

    let objcHerderStr = '';

    let jsonTestCase = `{
  "anInt": 1,
  "aDouble": 2.3,
  "aString": "hello",
  "aBool": false,
  "anObj": {
    "name": "x",
    "age": 18.1
  },
  "anObjList": [
    {
      "name": "y"
    }
  ],
  "aStrList": [
    "something"
  ],
  "multidimensional": [
    [
      [
        {
          "name": "y"
        }
      ]
    ]
  ]
}`;

    function tryParseJSON(jsonString) {
      try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
          return o;
        }
      }
      catch (e) { }
      return false;
    }

    function generate() {
      let forceStringCheckBox = $('#forceStringCheckBox').prop('checked');
      console.log(forceStringCheckBox);

      let jsonStr = $('#origJsonTextarea').val();

      if (jsonStr.length === 0) {
        $('#formatedJson').text('请输入json');
      } else {
        let jsonObj = tryParseJSON(jsonStr);
        if (jsonObj) {

          //snake to camel
          const snakeToCamel = (str) => str.replace(
            /([-_][a-z])/g,
            (group) => group.toUpperCase()
              .replace('-', '')
              .replace('_', '')
          );

          //去除重复元素
          let removeSurplusElement = (obj) => {
            if (Array.isArray(obj)) {
              obj.length = 1;
              removeSurplusElement(obj[0]);
            }
            else if (typeof obj === 'object') {
              for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                  removeSurplusElement(obj[key])
                }
              }
            }
          };
          //大写转换
          let uppercaseFirst = (string) => {
            return string.charAt(0).toUpperCase() + string.slice(1);
          };
          //Dart关键字保护
          let dartKeywordDefence = key => {
            if (typeof key === 'string') {
              //https://dart.dev/guides/language/language-tour
              let reservedKeywords = ["double","int","String","bool","List","abstract", "dynamic", "implements", "show", "as", "else", "import", "static", "assert", "enum", "in", "super", "async", "export", "interface", "switch", "await", "extends", "is", "sync", "break", "external", "library", "this", "case", "factory", "mixin", "throw", "catch", "false", "new", "true", "class", "final", "null", "try", "const", "finally", "on", "typedef", "continue", "for", "operator", "var", "covariant", "Function", "part", "void", "default", "get", "rethrow", "while", "deferred", "hide", "return", "with", "do", "if", "set", "yield"];
              if (reservedKeywords.includes(key)) {
                return `the${uppercaseFirst(key)}`;
              }
            }
            return key;
          };

          //泛型字符串生成器
          let genericStringGenerator = (innerClass, count) => {
            let genericStrings = [innerClass];
            while (count) {
              genericStrings.unshift('List<');
              genericStrings.push('>');
              count--;
            }
            let genericString = genericStrings.join('');
            return genericString;
          }

          //!获取最内层对象,类型和层数
          let getInnerObjInfo = (arr, className) => {
            let count = 0;
            let getInnerObj = (arr) => {
              if (Array.isArray(arr)) {
                let first = arr[0];
                count++;
                return getInnerObj(first);
              }
              else {
                return arr;
              }
            }

            let inner = getInnerObj(arr);

            let innerClass = className;
            if (typeof inner === 'string') {
              innerClass = 'String';
            }
            else if (typeof inner === 'number') {
              if (Number.isInteger(inner)) {
                innerClass = 'int';

              } else {
                innerClass = 'double';
              }
            }
            else if (typeof inner === 'boolean') {
              innerClass = 'bool';
            }
            if (forceStringCheckBox) {
              innerClass = 'String';
            }
            return { inner, innerClass, count };
          };
          //!获取数组循环语句
          let getIterateLines = (arr, className, key, legalKey, jsonKey) => {

            function makeBlank(count) {
              let str = '';
              for (let index = 0; index < count + 1; index++) {
                str += '  ';
              }
              return str;
            };

            let { inner, innerClass, count } = getInnerObjInfo(arr, className);
            let total = count;
            let fromJsonLines = [];
            let toJsonLines = [];

            count--;

            if (typeof inner === 'object') {
              fromJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(${className}.fromJson(v));\n${makeBlank(count * 3)}});`);
              toJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v.toJson());\n${makeBlank(count * 3)}});`);
            } else {
              if ((typeof inner === 'string') || (typeof inner === 'number') || (typeof inner === 'boolean')) {
                if ((typeof inner === 'number') && !Number.isInteger(inner)) {
                  fromJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v.toDouble());\n${makeBlank(count * 3)}});`);
                }
                else {
                  fromJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v);\n${makeBlank(count * 3)}});`);
                }
                toJsonLines.push(`${makeBlank(count * 3)}v.forEach((v) {\n${makeBlank(count * 4)}arr${count}.add(v);\n${makeBlank(count * 3)}});`);
              }
            }

            while (count) {
              fromJsonLines.unshift(`${makeBlank(count * 2)}v.forEach((v) {\n${makeBlank(count * 3)}var arr${count} = ${genericStringGenerator(innerClass, total - count)}();`);
              fromJsonLines.push(`${makeBlank(count * 3)}arr${count - 1}.add(arr${count});\n${makeBlank(count * 2)}});`);
              toJsonLines.unshift(`${makeBlank(count * 2)}v.forEach((v) {\n${makeBlank(count * 3)}var arr${count} = List();`);
              toJsonLines.push(`${makeBlank(count * 3)}arr${count - 1}.add(arr${count});\n${makeBlank(count * 2)}});`);
              count--;
            }

            fromJsonLines.unshift(`${makeBlank(count * 2)}if (json[${jsonKey}] != null) {\n${makeBlank(count * 2)}var v = json[${jsonKey}];\n${makeBlank(count * 2)}var arr0 = ${genericStringGenerator(innerClass, total)}();`);
            fromJsonLines.push(`${makeBlank(count * 2)}${makeBlank(count)}${legalKey} = arr0;\n    }\n`);
            toJsonLines.unshift(`    if (${legalKey} != null) {\n      var v = ${legalKey};\n      var arr0 = List();`);
            toJsonLines.push(`      data[${jsonKey}] = arr0;\n    }\n`);

            let fromJsonLinesJoined = fromJsonLines.join('\r\n');
            let toJsonLinesJoined = toJsonLines.join('\r\n');
            return { fromJsonLinesJoined, toJsonLinesJoined };
          };

          //!json对象转dart
          let objToDart = (jsonObj, prefix, baseClass) => {

            if (Array.isArray(jsonObj)) {
              return objToDart(jsonObj[0], prefix, baseClass);
            }

            let lines = [];

            let jsonKeysLines = [];

            let propsLines = [];
            let constructorLines = [];
            let fromJsonLines = [];
            let toJsonLines = [];

            let shouldUsingJsonKey = $('#usingJsonKeyCheckBox').prop('checked');
            let isJsonKeyPrivate = $('#jsonKeyPrivateCheckBox').prop('checked');
            let shouldConvertSnakeToCamel = $('#camelCheckBox').prop('checked');

            let className = `${prefix}${uppercaseFirst(baseClass)}`;
            if (shouldConvertSnakeToCamel) {
              className = snakeToCamel(className);
            }

            lines.push(`class ${className} {`);
            lines.push(`/*\r\n${JSON.stringify(jsonObj, null, 2)} \r\n*/\r\n`);

            constructorLines.push(`  ${className}({\n`);
            fromJsonLines.push(`  ${className}.fromJson(Map<String, dynamic> json) {\n`);
            toJsonLines.push(`  Map<String, dynamic> toJson() {\n`);
            toJsonLines.push(`    final Map<String, dynamic> data = Map<String, dynamic>();\n`);

            for (let key in jsonObj) {
              if (jsonObj.hasOwnProperty(key)) {
                let element = jsonObj[key];

                let legalKey = dartKeywordDefence(key);

                if (shouldConvertSnakeToCamel) {
                  legalKey = snakeToCamel(legalKey);
                }

                let jsonKey = `"${key}"`;
                if (shouldUsingJsonKey) {
                  jsonKey = `${isJsonKeyPrivate ? '_' : ''}jsonKey${className}${uppercaseFirst(legalKey)}`;
                }
                jsonKeysLines.push(`const String ${jsonKey} = "${key}";`);
                constructorLines.push(`    this.${legalKey},\n`);

                if (typeof element === 'string') {
                  propsLines.push(`  String ${legalKey};\n`);
                  fromJsonLines.push(`    ${legalKey} = json[${jsonKey}]${forceStringCheckBox?'.toString()':''};\n`);
                  toJsonLines.push(`    data[${jsonKey}] = ${legalKey};\n`);
                }
                else if (typeof element === 'number') {
                  let type = 'double'
                  let toDouble = '.toDouble()'
                  if (forceStringCheckBox) {
                    type = 'String';
                    toDouble = '.toString()';
                  }
                  else if (Number.isInteger(element)) {
                    type = 'int';
                    toDouble = '';
                  }
                  propsLines.push(`  ${type} ${legalKey};\n`);
                  fromJsonLines.push(`    ${legalKey} = json[${jsonKey}]${toDouble};\n`);
                  toJsonLines.push(`    data[${jsonKey}] = ${legalKey};\n`);
                }
                else if (typeof element === 'boolean') {
                  propsLines.push(`  bool ${legalKey};\n`);
                  fromJsonLines.push(`    ${legalKey} = json[${jsonKey}];\n`);
                  toJsonLines.push(`    data[${jsonKey}] = ${legalKey};\n`);
                }
                else if (typeof element === 'object') {

                  let subClassName = `${className}${uppercaseFirst(key)}`;
                  if (shouldConvertSnakeToCamel) {
                    subClassName = snakeToCamel(subClassName);
                  }
                  if (Array.isArray(element)) {
                    let { inner, innerClass, count } = getInnerObjInfo(element, subClassName);
                    let { fromJsonLinesJoined, toJsonLinesJoined } = getIterateLines(element, subClassName, key, legalKey, jsonKey);
                    let genericString = genericStringGenerator(innerClass, count);
                    propsLines.push(`  ${genericString} ${legalKey};\n`);
                    fromJsonLines.push(fromJsonLinesJoined);
                    toJsonLines.push(toJsonLinesJoined);
                    if (typeof inner === 'object') {
                      lines.unshift(objToDart(element, className, key));
                    }
                  }
                  else {
                    lines.unshift(objToDart(element, className, key));
                    propsLines.push(`  ${subClassName} ${legalKey};\n`);
                    fromJsonLines.push(`    ${legalKey} = json[${jsonKey}] != null ? ${subClassName}.fromJson(json[${jsonKey}]) : null;\n`);
                    toJsonLines.push(`    if (${legalKey} != null) {\n      data[${jsonKey}] = ${legalKey}.toJson();\n    }\n`);
                  }
                }
              }
            }
            if (shouldUsingJsonKey) {
              lines.unshift(jsonKeysLines.join('\n'));
            }

            constructorLines.push(`  });`);
            fromJsonLines.push(`  }`);
            toJsonLines.push(`    return data;\n  }`);

            lines.push(propsLines.join(''));
            lines.push(constructorLines.join(''));
            lines.push(fromJsonLines.join(''));
            lines.push(toJsonLines.join(''));

            lines.push(`}\n`);

            let linesOutput = lines.join('\r\n');

            return linesOutput;
          };

          removeSurplusElement(jsonObj);
          //美化
          let prettyJson = JSON.stringify(jsonObj, null, 2);
          //生成JSON
          let highlightJson = hljs.highlight('json', prettyJson);
          $('#formatedJson').html(highlightJson.value);

          let rootClass = $('#classNameTextField').val();
          let dartCode = `///\n/// Code generated by jsonToDartModel https://ashamp.github.io/jsonToDartModel/\n///\n${objToDart(jsonObj, rootClass, "")}`;

          objcHerderStr = dartCode;
          let highlightDartCode = hljs.highlight('dart', dartCode);
          $('#dartCode').html(highlightDartCode.value);

        } else {
          $('#formatedJson').text('parse failed, \nplease check your json string :)');
        }
      }
    }

    function textFieldBinding(tfID, defaultValue) {
      let selector = '#' + tfID;
      let strFromCookie = $.cookie(tfID);
      if ((strFromCookie === undefined || strFromCookie.length === 0) && defaultValue) {
        $.cookie(tfID, defaultValue);
      }
      $(selector).val($.cookie(tfID));
      $(selector).on('input', function (e) {
        let text = $(this).val();
        $.cookie(tfID, text);
        generate();
      });
    }

    textFieldBinding('origJsonTextarea', jsonTestCase);
    textFieldBinding('classNameTextField', 'SomeRootEntity');

    function checkBoxBinding(checkBoxID, checked) {
      let defaultValue = checked ? '1' : '0';
      let selector = '#' + checkBoxID;
      let strFromCookie = $.cookie(checkBoxID);
      if (strFromCookie === undefined || strFromCookie.length === 0) {
        $.cookie(checkBoxID, defaultValue);
      }
      checked = $.cookie(checkBoxID) === '1';
      $(selector).prop('checked', checked);
      $(selector).on('change', function () {
        let checked = $(this).prop('checked') ? '1' : '0';
        $.cookie(checkBoxID, checked);
        generate();
      });
    }

    checkBoxBinding('jsonKeyPrivateCheckBox', true);
    checkBoxBinding('usingJsonKeyCheckBox', false);
    checkBoxBinding('camelCheckBox', true);
    checkBoxBinding('forceStringCheckBox', false);

    $('#usingJsonKeyCheckBox').on('change', function () {
      $('#jsonKeyPrivateCheckBox').prop('disabled', !(this.checked));
    });
    $('#jsonKeyPrivateCheckBox').prop('disabled', !($('#usingJsonKeyCheckBox').prop('checked')));

    generate();

    function copyToClipboard(text) {
      var $temp = $("<textarea>");
      $("body").append($temp);
      $temp.val(text).select();
      document.execCommand("copy");
      $temp.remove();
    }

    $('#copyFileBtn').click(function () {
      copyToClipboard(objcHerderStr);
    });

  })();
});