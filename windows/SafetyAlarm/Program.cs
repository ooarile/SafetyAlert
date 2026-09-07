using System;
using System.Threading;
using System.Windows.Forms;

namespace SafetyAlarm;

static class Program
{
    [STAThread]
    static void Main()
    {
        // 시작 프로그램 등록과 수동 실행이 겹쳐 두 번 뜨는 것을 막습니다.
        using var single = new Mutex(true, @"Local\SafetyAlarm", out bool isFirst);
        if (!isFirst) return;

        ApplicationConfiguration.Initialize();
        Application.Run(new AlarmContext());
    }
}
