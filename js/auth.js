// auth.js — 인증 관련

const Auth = (() => {
  let _user = null;

  function getUser() { return _user; }

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    _user = session?.user ?? null;

    supabase.auth.onAuthStateChange((_event, session) => {
      _user = session?.user ?? null;
      if (_user) {
        App.showApp();
      } else {
        App.showCover();
      }
    });

    return _user;
  }

  async function loginEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signupEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function loginGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      }
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return { init, getUser, loginEmail, signupEmail, loginGoogle, logout };
})();
