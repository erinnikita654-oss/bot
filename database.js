import { supabase } from './config.js';

export async function getOrCreateUser(telegramId, username, firstName) {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching user:', fetchError);
    throw fetchError;
  }

  if (existingUser) {
    await supabase
      .from('users')
      .update({ last_interaction: new Date().toISOString() })
      .eq('id', existingUser.id);

    return existingUser;
  }

  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      username: username,
      first_name: firstName,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating user:', createError);
    throw createError;
  }

  return newUser;
}

export async function saveUserEvent(userId, eventText, category) {
  const { data, error } = await supabase
    .from('user_events')
    .insert({
      user_id: userId,
      event_text: eventText,
      category: category,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving event:', error);
    throw error;
  }

  return data;
}

export async function saveStory(category, storyText) {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      category: category,
      story_text: storyText,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving story:', error);
    throw error;
  }

  return data;
}

export async function incrementStoryUsage(storyId) {
  const { error } = await supabase.rpc('increment_story_usage', {
    story_id: storyId,
  });

  if (error) {
    console.error('Error incrementing story usage:', error);
  }
}

export async function getRandomStoryByCategory(category) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('category', category)
    .order('times_used', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error fetching stories:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}
